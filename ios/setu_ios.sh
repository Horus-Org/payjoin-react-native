#!/bin/bash
# Script to initialize and verify iOS project setup

# Navigate to project root
cd /Users/runner/work/payjoin-react-native/payjoin-react-native

# Ensure ios directory exists
if [ ! -d "ios" ]; then
  echo "Creating ios directory..."
  mkdir ios
fi

# Initialize React Native iOS project if not present
if [ ! -f "ios/PayjoinReactNative.xcodeproj" ]; then
  echo "Initializing React Native iOS project..."
  npx react-native init PayjoinReactNative --directory ios --skip-install
fi

# Ensure Package.swift is in ios directory
if [ ! -f "ios/Package.swift" ]; then
  echo "Copying Package.swift to ios directory..."
  # Assuming Package.swift is provided in a temporary location
  cp ./Package.swift ios/
fi

# Create Sources directory structure
mkdir -p ios/Sources/PayjoinReactNative/include
if [ -f "ios/PayjoinModule.swift" ]; then
  mv ios/PayjoinModule.swift ios/Sources/PayjoinReactNative/
fi
if [ -f "ios/PayjoinModule.m" ]; then
  mv ios/PayjoinModule.m ios/Sources/PayjoinReactNative’.
fi

# Install CocoaPods dependencies
cd ios
if [ -f "Podfile" ]; then
  pod install
else
  echo "Podfile missing. Please add Podfile from previous instructions."
  exit 1
fi
cd ..

# Verify xcodebuild
echo "Verifying Xcode project..."
xcodebuild -list -json

# Verify Swift build
cd ios
swift build -v
cd ..