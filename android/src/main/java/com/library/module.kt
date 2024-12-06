package com.PayjoinAndroid;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import org.bitcoinj.core.Transaction;
import org.bitcoinj.wallet.Wallet;
import org.bitcoinj.core.NetworkParameters;
import org.bitcoinj.params.MainNetParams;
import org.bitcoinj.wallet.SendRequest;
import org.bitcoinj.wallet.WalletAppKit;

import java.io.File;

public class PayjoinAndroid extends ReactContextBaseJavaModule {

    private final NetworkParameters networkParameters = MainNetParams.get();
    private final WalletAppKit walletAppKit;

    public YourLibraryModule(ReactApplicationContext context) {
        super(context);
        File walletDirectory = context.getFilesDir();
        walletAppKit = new WalletAppKit(networkParameters, walletDirectory, "walletappkit");
        walletAppKit.startAsync();
        walletAppKit.awaitRunning();
    }

    @Override
    public String getName() {
        return "PayjoinAndroid";
    }

    @ReactMethod
    public void createPayJoinTransaction(String senderAddress, String receiverAddress, double amountToSend, Promise promise) {
        try {
            Wallet wallet = walletAppKit.wallet();
            SendRequest sendRequest = SendRequest.to(
                    org.bitcoinj.core.Address.fromString(networkParameters, receiverAddress),
                    (long) (amountToSend * 1e8)); // Convert to satoshis

            wallet.completeTx(sendRequest);
            String psbtBase64 = sendRequest.tx.bitcoinSerialize().toString();
            promise.resolve(psbtBase64);
        } catch (Exception e) {
            promise.reject("CREATE_PAYJOIN_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void sendPayJoinRequest(String psbt, String endpointUrl, Promise promise) {
        try {
            // Simulate sending the PSBT to a PayJoin endpoint (actual HTTP request should be implemented)
            // For now, we'll just return the received PSBT as modified PSBT
            String modifiedPsbt = psbt + "-modified"; // Placeholder logic
            promise.resolve(modifiedPsbt);
        } catch (Exception e) {
            promise.reject("SEND_PAYJOIN_REQUEST_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void finalizeAndBroadcastTransaction(String modifiedPsbt, Promise promise) {
        try {
            // Simulate finalizing and broadcasting the transaction
            Transaction tx = new Transaction(networkParameters, modifiedPsbt.getBytes());
            walletAppKit.peerGroup().broadcastTransaction(tx).broadcast();
            promise.resolve("Transaction broadcasted successfully");
        } catch (Exception e) {
            promise.reject("FINALIZE_BROADCAST_ERROR", e.getMessage(), e);
        }
    }
}
