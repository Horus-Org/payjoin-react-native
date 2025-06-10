import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import { Buffer } from 'buffer';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

// Initialize ECPair with secp256k1
const ECPair = ECPairFactory(ecc);

// Define types for UTXO and PayJoin response
interface Utxo {
  txid: string;
  vout: number;
  hex: string;
  timelock: number;
  amount: bigint; // Use bigint for satoshi amounts
  address: string;
  preimage: string;
  scriptPubKey: string;
  confirmations: number;
  is_coinbase: boolean;
  mempool: string;
  height: number;
}

interface PayJoinRequest {
  psbt: string;
}

interface PayJoinResponse {
  psbt: string;
}

// Fetch UTXOs from a blockchain API (using Blockstream as example)
async function fetchUtxos(senderAddress: string, networkName: 'testnet' | 'bitcoin' = 'testnet'): Promise<Utxo[]> {
  const baseUrl = networkName === 'testnet' ? 'https://blockstream.info/testnet/api' : 'https://blockstream.info/api';
  try {
    const response = await axios.get(`${baseUrl}/address/${senderAddress}/utxo`);
    const utxos = response.data.map((utxo: any) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      hex: '',
      timelock: 0,
      amount: BigInt(utxo.value), // Store as bigint
      address: senderAddress,
      preimage: '',
      scriptPubKey: '',
      confirmations: utxo.status.confirmed ? 6 : 0,
      is_coinbase: false,
      mempool: utxo.status.confirmed ? 'confirmed' : 'pending',
      height: utxo.status.block_height || 0,
    }));

    for (const utxo of utxos) {
      const txResponse = await axios.get(`${baseUrl}/tx/${utxo.txid}/hex`);
      utxo.hex = txResponse.data;
      const txDetails = await axios.get(`${baseUrl}/tx/${utxo.txid}`);
      utxo.scriptPubKey = txDetails.data.vout[utxo.vout].scriptpubkey;
    }

    return utxos;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error(`Failed to fetch UTXOs: ${error.message}`);
  }
}

// Validate Payjoin V2 PSBT (BIP-78 compliance)
function validatePayjoinPsbt(originalPsbt: bitcoin.Psbt, modifiedPsbt: bitcoin.Psbt, maxFeeContribution: number, network: bitcoin.Network): boolean {
  try {
    // Check that original outputs are preserved
    const originalOutputs = originalPsbt.txOutputs;
    const modifiedOutputs = modifiedPsbt.txOutputs;

    for (const origOutput of originalOutputs) {
      const matchingOutput = modifiedOutputs.find(
        (out) => Buffer.compare(Buffer.from(out.script), Buffer.from(origOutput.script)) === 0 && out.value === origOutput.value,      );
      if (!matchingOutput) {
        throw new Error('Receiver modified original outputs');
      }
    }

    // Check that additional inputs belong to receiver
    const originalInputs = originalPsbt.data.inputs.map((input) => (input.witnessUtxo?.script?.toString() ?? '') + (input ?? ''));      
     const modifiedInputs = modifiedPsbt.data.inputs.map((input) => (input.witnessUtxo?.script?.toString() ?? '') + (input ?? ''));            
     const newInputs = modifiedInputs.filter((input) => !originalInputs.includes(input));

    if (newInputs.length === 0) {
      throw new Error('Receiver did not contribute any inputs');
    }

    // Calculate fee contribution
    const originalFee = originalPsbt.getFee();
    const modifiedFee = modifiedPsbt.getFee();
    const feeDifference = modifiedFee - originalFee;

    if (feeDifference > maxFeeContribution) {
      throw new Error(`Receiver's fee contribution (${feeDifference}) exceeds max allowed (${maxFeeContribution})`);
    }

    // Ensure no unexpected script modifications
    for (let i = 0; i < originalPsbt.data.inputs.length; i++) {
      const origScript = originalPsbt.data.inputs[i].witnessUtxo?.script;
      const modScript = modifiedPsbt.data.inputs[i].witnessUtxo?.script;
      if (origScript && modScript && Buffer.compare(origScript, modScript) !== 0) {
        throw new Error('Receiver modified sender input scripts');
      }
    }

    return true;
  } catch (error: any) {
    console.error(`Payjoin validation failed: ${error.message}`);
    return false;
  }
}
// Create initial PSBT with Payjoin V2 considerations
async function createInitialPayJoinTx(
  senderAddress: string,
  receiverAddress: string,
  amountToSend: bigint,
  feeRate: number = 1000,
  maxFeeContribution: number = 10000,
  networkName: 'testnet' | 'bitcoin' = 'testnet',
): Promise<bitcoin.Psbt> {
  if (feeRate <= 0 || maxFeeContribution < 0) {
    throw new Error('Invalid fee rate or max fee contribution');
  }

  const network = networkName === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
  try {
    const psbt = new bitcoin.Psbt({ network });

    // Fetch UTXOs for sender
    const utxos = await fetchUtxos(senderAddress, networkName);

    if (!utxos.length) {
      throw new Error('No UTXOs available');
    }

    // Calculate total available amount and add inputs
    let totalInput = BigInt(0);
    for (const utxo of utxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(utxo.hex, 'hex'),
        witnessUtxo: {
          script: Buffer.from(utxo.scriptPubKey, 'hex'),
          value: BigInt(utxo.amount),
        },
      });
      totalInput += utxo.amount;
    }

    // Add receiver output
    psbt.addOutput({
      address: receiverAddress,
      value: amountToSend,
    });

    // Estimate transaction size (rough: ~148 bytes/input, ~34 bytes/output)
    const inputCount = utxos.length;
    const outputCount = 2; // Receiver + change
    const txSize = inputCount * 148 + outputCount * 34 + 10; // +10 for header
    const estimatedFee = BigInt(Math.ceil(txSize * feeRate)) + BigInt(maxFeeContribution);
    const change = totalInput - amountToSend - estimatedFee;

    if (change > BigInt(546)) { // Dust threshold
      psbt.addOutput({
        address: senderAddress,
        value: change,
      });
    }

    psbt.setMaximumFeeRate(feeRate * 2);

    return psbt;
  } catch (error: any) {
    throw new Error(`Failed to create initial PSBT: ${error.message}`);
  }
}
// Send PSBT to receiver's PayJoin endpoint
async function sendPayJoinRequest(psbt: bitcoin.Psbt, endpoint: string, network: bitcoin.Network): Promise<bitcoin.Psbt> {
  try {
    const response = await axios.post<PayJoinResponse>(
      endpoint,
      { psbt: psbt.toBase64() },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const modifiedPsbt = bitcoin.Psbt.fromBase64(response.data.psbt, { network });

    // Validate the modified PSBT
    if (!validatePayjoinPsbt(psbt, modifiedPsbt, 10000, network)) {
      throw new Error('Invalid Payjoin response from receiver');
    }

    return modifiedPsbt;
  } catch (error: any) {
    throw new Error(`PayJoin request failed: ${error.message}`);
  }
}

// Broadcast transaction to the network
async function broadcastTransaction(txHex: string, networkName: 'testnet' | 'bitcoin' = 'testnet'): Promise<string> {
  const baseUrl = networkName === 'testnet' ? 'https://blockstream.info/testnet/api' : 'https://blockstream.info/api';
  try {
    const response = await axios.post(`${baseUrl}/tx`, txHex);
    return response.data; // Returns txid
  } catch (error: any) {
    throw new Error(`Broadcast failed: ${error.message}`);
  }
}

// Finalize, sign, and broadcast PayJoin transaction
async function finalizeAndBroadcast(
  modifiedPsbt: bitcoin.Psbt,
  senderKeyPair: any,
  networkName: 'testnet' | 'bitcoin' = 'testnet',
): Promise<string> {
  try {
    // Sign all inputs
    modifiedPsbt.signAllInputs(senderKeyPair);

    // Finalize all inputs
    modifiedPsbt.finalizeAllInputs();

    // Extract and broadcast the transaction
    const tx = modifiedPsbt.extractTransaction();
    const txHex = tx.toHex();

    const txid = await broadcastTransaction(txHex, networkName);
    return txid;
  } catch (error: any) {
    throw new Error(`Failed to finalize and broadcast: ${error.message}`);
  }
}

// Example usage for Payjoin V2
async function executePayJoin(
  senderWIF: string,
  senderAddress: string,
  receiverAddress: string,
  amount: bigint,
  payjoinEndpoint: string,
  networkName: 'testnet' | 'bitcoin' = 'testnet',
) {
  const network = networkName === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
  try {
    // Generate key pair from WIF
    const senderKeyPair = ECPair.fromWIF(senderWIF, network);

    // Create initial transaction with Payjoin V2 parameters
    const initialPsbt = await createInitialPayJoinTx(
      senderAddress,
      receiverAddress,
      amount,
      1000,
      10000,
      networkName,
    );

    // Send to receiver for PayJoin contribution
    const modifiedPsbt = await sendPayJoinRequest(initialPsbt, payjoinEndpoint, network);

    // Finalize and broadcast
    const txid = await finalizeAndBroadcast(modifiedPsbt, senderKeyPair, networkName);

    console.log(`Payjoin V2 transaction broadcasted: ${txid}`);
    return txid;
  } catch (error: any) {
    console.error(`PayJoin V2 failed: ${error.message}`);
    throw error;
  }
}

export {
  createInitialPayJoinTx,
  sendPayJoinRequest,
  finalizeAndBroadcast,
  broadcastTransaction,
  fetchUtxos,
  validatePayjoinPsbt,
};