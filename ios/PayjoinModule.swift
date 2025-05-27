import Foundation
import LibWally
import React

@objc(PayjoinModule)
class PayjoinModule: NSObject {
    @objc
    func createInitialPsbt(
        _ senderAddress: String,
        receiverAddress: String,
        amount: Int,
        feeRate: Int,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        do {
            // Initialize network (testnet)
            let network = Network.testnet
            
            // Fetch UTXOs (simplified, assuming a helper function)
            let utxos = try fetchUtxos(senderAddress: senderAddress)
            
            // Create PSBT
            let psbt = try PSBT(network: network)
            var totalInput: UInt64 = 0
            
            // Add inputs
            for utxo in utxos {
                let txid = try Hash(fromHex: utxo.txid)
                let input = try PSBTInput(
                    txid: txid,
                    vout: UInt32(utxo.vout),
                    value: UInt64(utxo.amount),
                    scriptPubKey: try Script(hex: utxo.scriptPubKey)
                )
                try psbt.addInput(input)
                totalInput += UInt64(utxo.amount)
            }
            
            // Add receiver output
            let receiverScript = try Address(receiverAddress, network: network).scriptPubKey
            try psbt.addOutput(value: UInt64(amount), script: receiverScript)
            
            // Add change output
            let estimatedFee = UInt64(feeRate * 200 + 10000) // Max fee contribution
            let change = totalInput - UInt64(amount) - estimatedFee
            if change > 546 { // Dust threshold
                let changeScript = try Address(senderAddress, network: network).scriptPubKey
                try psbt.addOutput(value: change, script: changeScript)
            }
            
            // Return PSBT as base64
            resolve(psbt.description)
        } catch {
            reject("PSBT_CREATION_FAILED", error.localizedDescription, error)
        }
    }
    
    @objc
    func signAndFinalizePsbt(
        _ psbtBase64: String,
        privateKeyWif: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        do {
            // Parse PSBT
            guard let psbt = try PSBT(psbtBase64) else {
                throw NSError(domain: "Invalid PSBT", code: -1, userInfo: nil)
            }
            
            // Sign with private key
            let key = try ECPrivateKey(wif: privateKeyWif, network: .testnet)
            try psbt.sign(key: key)
            
            // Finalize PSBT
            try psbt.finalize()
            
            // Extract transaction hex
            let tx = try psbt.extract()
            resolve(tx.hex)
        } catch {
            reject("SIGNING_FAILED", error.localizedDescription, error)
        }
    }
    
    // Helper function to fetch UTXOs (simplified)
    private func fetchUtxos(senderAddress: String) throws -> [Utxo] {
        // Implement network request to fetch UTXOs (e.g., using URLSession)
        // This is a placeholder; replace with actual API call
        return []
    }
}