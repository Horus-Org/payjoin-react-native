import Foundation

@objc(YourLibrary)
class YourLibrary: NSObject {
  @objc
  func sampleMethod(_ input: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve("iOS: " + input)
  }
}
