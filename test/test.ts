import { executePayJoin } from '../src/index';

// Testnet example (use real testnet credentials)
async function runTest() {
  try {
    // Replace these with actual testnet values
    const senderWIF = 'cYourTestnetPrivateKeyInWIF'; // Get from a testnet wallet
    const senderAddress = 'tb1q...'; // Sender's testnet address
    const receiverAddress = 'tb1q...'; // Receiver's testnet address
    const amount = 100000; // 0.001 BTC in satoshis
    const payjoinEndpoint = 'https://testnet-payjoin-server.example.com/payjoin'; // Mock or real PayJoin server

    const txid = await executePayJoin(
      senderWIF,
      senderAddress,
      receiverAddress,
      amount,
      payjoinEndpoint
    );

    console.log(`Transaction successful! TXID: ${txid}`);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();