// File: index.ts

import bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import { NativeModules, Platform } from 'react-native';

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
}

interface Payjoin {
  psbt: string;
}

interface PayJoinRequest {
  psbt: string;
}

interface PayJoinResponse {
  psbt: string;
}

// Create initial PSBT
async function createInitialPayJoinTx(
  senderAddress: string,
  receiverAddress: string,
  amountToSend: number
): Promise<bitcoin.Psbt> {
  const psbt = new bitcoin.Psbt();

  // Fetch UTXOs for sender (placeholder logic)
  const utxos: Utxo[] = await fetchUtxos(senderAddress);

  // Add UTXOs as inputs
  utxos.forEach((utxo) => {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(utxo.hex, 'hex'),
    });
  });

  // Add receiver address as output
  psbt.addOutput({
    address: receiverAddress,
    value: BigInt(amountToSend),
  });

  return psbt;
}

// Send PSBT to receiver's PayJoin endpoint
async function sendPayJoinRequest(psbt: bitcoin.Psbt): Promise<bitcoin.Psbt> {
  const url = 'https://receiver.payjoin.endpoint/payjoin';

  const response = await axios.post<PayJoinResponse>(url, { psbt: psbt.toBase64() });

  // Get the modified PSBT from receiver
  const modifiedPsbt = bitcoin.Psbt.fromBase64(response.data.psbt);

  return modifiedPsbt;
}

// Finalize, sign, and broadcast PayJoin transaction
async function finalizeAndBroadcast(
  modifiedPsbt: bitcoin.Psbt,
  senderPrivateKey: string
): Promise<void> {
  const keyPair = bitcoin.fromWIF(senderPrivateKey);

  // Sign the transaction
  modifiedPsbt.signAllInputs(keyPair);

  // Validate and finalize

  modifiedPsbt.validateSignaturesOfAllInputs((pubkey, msghash, signature) => {
    return bitcoin.fromPublicKey(pubkey).verify(msghash, signature);
  });  modifiedPsbt.finalizeAllInputs();

  const txHex = modifiedPsbt.extractTransaction().toHex();

  // Broadcast transaction (placeholder logic)
  await broadcastTransaction(txHex);

}// Fetch UTXOs for a given address (placeholder implementation)async function fetchUtxos(senderAddress: string): Promise<Utxo[]> {
  // Replace with actual API call to fetch UTXOs
  return [
    {
      txid: 'dummy-txid',
      vout: 0,
      hex: 'dummy-hex',
      timelock: 0,
      amount: 1000000,
      address: address,
      preimage: '',
      scriptPubKey: '',
      confirmations: 10,
      is_coinbase: false,
    },
  ];}

async function broadcastTransaction(txHex: string): Promise<void> {
  console.log(`Broadcasting transaction: ${txHex}`);
  // Implement actual broadcasting logic using a Bitcoin node or API
}

const PayjoinReactNative = NativeModules.PayjoinReactNative;

const sampleMethod = async (input: string): Promise<string> => {
  return await PayjoinReactNative.sampleMethod(input);
};

export default {
  sampleMethod,
  createInitialPayJoinTx,
  sendPayJoinRequest,
  finalizeAndBroadcast,
};

// Run a demo
(async () => {
  const senderAddress = 'sender-test-address';
  const receiverAddress = 'receiver-test-address';
  const amountToSend = 100000; // Satoshis

  try {
    const initialPsbt = await createInitialPayJoinTx(senderAddress, receiverAddress, amountToSend);
    console.log('Initial PSBT created:', initialPsbt.toBase64());

    const modifiedPsbt = await sendPayJoinRequest(initialPsbt);
    console.log('Modified PSBT received:', modifiedPsbt.toBase64());

    const senderPrivateKey = 'dummy-private-key';
    await finalizeAndBroadcast(modifiedPsbt, senderPrivateKey);
    console.log('Transaction finalized and broadcasted.');
  } catch (error) {
    console.error('Error in PayJoin process:', error);
  }
})();
