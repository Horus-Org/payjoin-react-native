#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PayjoinModule, NSObject)

RCT_EXTERN_METHOD(createInitialPsbt:
                  (NSString *)senderAddress
                  receiverAddress:(NSString *)receiverAddress
                  amount:(NSInteger)amount
                  feeRate:(NSInteger)feeRate
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(signAndFinalizePsbt:
                  (NSString *)psbtBase64
                  privateKeyWif:(NSString *)privateKeyWif
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end