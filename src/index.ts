import bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import { Buffer } from 'buffer';

// Define types for UTXO and PayJoin response
interface Utxo {
  txid: string;
  vout: number;
  hex: string;
  timelock: number;
  amount: number;
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

// Configure Bitcoin network (using testnet as example)
const network = bitcoin.networks.testnet;

// Fetch UTXOs from a blockchain API (using Blockstream as example)
async function fetchUtxos(senderAddress: string): Promise<Utxo[]> {
  try {
    const response = await axios.get(`https://blockstream.info/testnet/api/address/${senderAddress}/utxo`);
    const utxos = response.data.map((utxo: any) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      hex: '',
      timelock: 0,
      amount: utxo.value,
      address: senderAddress,
      preimage: '',
      scriptPubKey: '',
      confirmations: utxo.status.confirmed ? 6 : 0,
      is_coinbase: false,
      mempool: utxo.status.confirmed ? 'confirmed' : 'pending',
      height: utxo.status.block_height || 0
    }));

    for (const utxo of utxos) {
      const txResponse = await axios.get(`https://blockstream.info/testnet/api/tx/${utxo.txid}/hex`);
      utxo.hex = txResponse.data;
      // Fetch scriptPubKey
      const txDetails = await axios.get(`https://blockstream.info/testnet/api/tx/${utxo.txid}`);
      utxo.scriptPubKey = txDetails.data.vout[utxo.vout].scriptpubkey;
    }

    return utxos;
  } catch (error) {
    throw new Error(`Failed to fetch UTXOs: ${error}`);
  }
}

// Validate Payjoin V2 PSBT (BIP-78 compliance)
function validatePayjoinPsbt(originalPsbt: bitcoin.Psbt, modifiedPsbt: bitcoin.Psbt, maxFeeContribution: number): boolean {
  try {
    // Check that original outputs are preserved
    const originalOutputs = originalPsbt.data.outputs;
    const modifiedOutputs = modifiedPsbt.data.outputs;

    // Verify that the receiver hasn't modified the original payment output
    for (const origOutput of originalOutputs) {
      const matchingOutput = modifiedOutputs.find(
        out => out.address === origOutput.address && out.value === origOutput.value
      );
      if (!matchingOutput && origOutput.address && origOutput.value) {
        throw new Error('Receiver modified original outputs');
      }
    }

    // Check that additional inputs belong to receiver (basic check, may need more robust validation)
    const originalInputs = originalPsbt.data.inputs.map(input => input.hash.toString('hex') + input.index);
    const modifiedInputs = modifiedPsbt.data.inputs.map(input => input.hash.toString('hex') + input.index);
    const newInputs = modifiedInputs.filter(input => !originalInputs.includes(input));
    
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
      if (originalPsbt.data.inputs[i].witnessUtxo?.script.toString('hex') !== 
          modifiedPsbt.data.inputs[i].witnessUtxo?.script.toString('hex')) {
        throw new Error('Receiver modified sender input scripts');
      }
    }

    return true;
  } catch (error) {
    console.error(`Payjoin validation failed: ${error}`);
    return false;
  }
}

// Create initial PSBT with Payjoin V2 considerations
async function createInitialPayJoinTx(
  senderAddress: string,
  receiverAddress: string,
  amountToSend: number,
  feeRate: number = 1000,
  maxFeeContribution: number = 10000 // Max fee contribution in satoshis
): Promise<bitcoin.Psbt> {
  try {
    const psbt = new bitcoin.Psbt({ network });
    
    // Fetch UTXOs for sender
    const utxos = await fetchUtxos(senderAddress);
    
    if (!utxos.length) {
      throw new Error('No UTXOs available');
    }

    // Calculate total available amount and add inputs
    let totalInput = 0;
    for (const utxo of utxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(utxo.hex, 'hex'),
        witnessUtxo: {
          script: Buffer.from(utxo.scriptPubKey, 'hex'),
          value: BigInt(utxo.amount)
        }
      });
      totalInput += utxo.amount;
    }

    // Add receiver output
    psbt.addOutput({
      address: receiverAddress,
      value: BigInt(amountToSend)
    });

    // Add change output (rough estimate, will be adjusted later)
    const estimatedFee = feeRate * 200 + maxFeeContribution; // Account for receiver's potential contribution
    const change = totalInput - amountToSend - estimatedFee;
    
    if (change > 546) { // Dust threshold
      psbt.addOutput({
        address: senderAddress,
        value: BigInt(change)
      });
    }

    // Add Payjoin V2 parameters
    psbt.setMaximumFeeRate(feeRate * 2); // Allow some flexibility for receiver's fee contribution

    return psbt;
  } catch (error) {
    throw new Error(`Failed to create initial PSBT: ${error}`);
  }
}

// Send PSBT to receiver's PayJoin endpoint
async function sendPayJoinRequest(psbt: bitcoin.Psbt, endpoint: string): Promise<bitcoin.Psbt> {
  try {
    const response = await axios.post<PayJoinResponse>(
      endpoint,
      { psbt: psbt.toBase64() },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const modifiedPsbt = bitcoin.Psbt.fromBase64(response.data.psbt, { network });
    
    // Validate the modified PSBT
    if (!validatePayjoinPsbt(psbt, modifiedPsbt, 10000)) {
      throw new Error('Invalid Payjoin response from receiver');
    }

    return modifiedPsbt;
  } catch (error) {
    throw new Error(`PayJoin request failed: ${error}`);
  }
}

// Broadcast transaction to the network
async function broadcastTransaction(txHex: string): Promise<string> {
  try {
    const response = await axios.post(
      'https://blockstream.info/testnet/api/tx',
      txHex
    );
    return response.data; // Returns txid
  } catch (error) {
    throw new Error(`Broadcast failed: ${error}`);
  }
}

// Finalize, sign, and broadcast PayJoin transaction
async function finalizeAndBroadcast(
  modifiedPsbt: bitcoin.Psbt,
  senderKeyPair: any
): Promise<string> {
  try {
    // Sign all inputs
    modifiedPsbt.signAllInputs(senderKeyPair);
    
    // Finalize all inputs
    modifiedPsbt.finalizeAllInputs();
    
    // Extract and broadcast the transaction
    const tx = modifiedPsbt.extractTransaction();
    const txHex = tx.toHex();
    
    const txid = await broadcastTransaction(txHex);
    return txid;
  } catch (error) {
    throw new Error(`Failed to finalize and broadcast: ${error}`);
  }
}

// Example usage for Payjoin V2
async function executePayJoin(
  senderWIF: string,
  senderAddress: string,
  receiverAddress: string,
  amount: number,
  payjoinEndpoint: string
) {
  try {
    // Generate key pair from WIF
    const ECPair = require('ecpair');
    const senderKeyPair = ECPair.fromWIF(senderWIF, network);

    // Create initial transaction with Payjoin V2 parameters
    const initialPsbt = await createInitialPayJoinTx(
      senderAddress,
      receiverAddress,
      amount,
      1000, // feeRate
      10000 // maxFeeContribution
    );

    // Send to receiver for PayJoin contribution
    const modifiedPsbt = await sendPayJoinRequest(initialPsbt, payjoinEndpoint);

    // Finalize and broadcast
    const txid = await finalizeAndBroadcast(modifiedPsbt, senderKeyPair);
    
    console.log(`Payjoin V2 transaction broadcasted: ${txid}`);
    return txid;
  } catch (error) {
    console.error(`PayJoin V2 failed: ${error}`);
    throw error;
  }
}

export { 
  createInitialPayJoinTx, 
  sendPayJoinRequest, 
  finalizeAndBroadcast, 
  broadcastTransaction,
  fetchUtxos,
  validatePayjoinPsbt
};
