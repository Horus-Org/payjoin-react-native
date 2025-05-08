import Foundation
import React

@objc(PayjoinModule)
class PayjoinModule: NSObject {
  @objc
  func initiatePayjoin(_ url: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Example Payjoin implementation
    do {
      // Simulate Payjoin operation (replace with actual Payjoin library call)
      let result = ["status": "success", "url": url]
      resolve(result)
    } catch {
      reject("PAYJOIN_ERROR", "Failed to initiate Payjoin", error)
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}