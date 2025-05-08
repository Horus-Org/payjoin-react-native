#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PayjoinModule, NSObject)

RCT_EXTERN_METHOD(initiatePayjoin:(NSString *)url resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end