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
      hex: '', // We'll need to fetch full tx hex separately
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

    // Fetch full transaction hex for each UTXO
    for (const utxo of utxos) {
      const txResponse = await axios.get(`https://blockstream.info/testnet/api/tx/${utxo.txid}/hex`);
      utxo.hex = txResponse.data;
    }

    return utxos;
  } catch (error) {
    throw new Error(`Failed to fetch UTXOs: ${error}`);
  }
}

// Create initial PSBT
async function createInitialPayJoinTx(
  senderAddress: string,
  receiverAddress: string,
  amountToSend: number,
  feeRate: number = 1000 // satoshis per byte
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
        nonWitnessUtxo: Buffer.from(utxo.hex, 'hex')
      });
      totalInput += utxo.amount;
    }

    // Add receiver output
    psbt.addOutput({
      address: receiverAddress,
      value: BigInt(amountToSend)
    });

    // Add change output (rough estimate, will be adjusted later)
    const estimatedFee = feeRate * 200; // Rough estimate of 200 bytes
    const change = totalInput - amountToSend - estimatedFee;
    
    if (change > 546) { // Dust threshold
      psbt.addOutput({
        address: senderAddress,
        value: BigInt(change)
      });
    }

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
    
    return bitcoin.Psbt.fromBase64(response.data.psbt, { network });
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
// Example usage
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

    // Create initial transaction
    const initialPsbt = await createInitialPayJoinTx(
      senderAddress,
      receiverAddress,
      amount
    );

    // Send to receiver for PayJoin contribution
    const modifiedPsbt = await sendPayJoinRequest(initialPsbt, payjoinEndpoint);

    // Finalize and broadcast
    const txid = await finalizeAndBroadcast(modifiedPsbt, senderKeyPair);
    
    console.log(`Transaction broadcasted: ${txid}`);
    return txid;
  } catch (error) {
    console.error(`PayJoin failed: ${error}`);
    throw error;
  }
}
export { 
  createInitialPayJoinTx, 
  sendPayJoinRequest, 
  finalizeAndBroadcast, 
  broadcastTransaction,
  fetchUtxos,
  executePayJoin 
};