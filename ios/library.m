#import <React/RCTBridgeModule.h>

@interface YourLibrary : NSObject <RCTBridgeModule>
@end

@implementation YourLibrary

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(sampleMethod:(NSString *)input resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  resolve([@"iOS: " stringByAppendingString:input]);
}

@end
