#!/bin/bash
# Script to initialize and verify Android project setup

# Navigate to project root
cd /Users/runner/work/payjoin-react-native/payjoin-react-native

# Ensure android directory exists
if [ ! -d "android" ]; then
  echo "Creating android directory..."
  mkdir android
fi

# Initialize Gradle wrapper if not present
cd android
if [ ! -f "gradlew" ]; then
  echo "Initializing Gradle wrapper..."
  gradle wrapper --gradle-version 7.6 --distribution-type all
fi

# Ensure gradlew is executable
if [ -f "gradlew" ]; then
  chmod +x gradlew
else
  echo "Failed to create gradlew. Please install Gradle and run 'gradle wrapper' manually."
  exit 1
fi

# Ensure settings.gradle, app/build.gradle, and MainApplication.java are present
if [ ! -f "settings.gradle" ]; then
  echo "settings.gradle missing. Please add from previous instructions."
  exit 1
fi
if [ ! -f "app/build.gradle" ]; then
  echo "app/build.gradle missing. Please add from previous instructions."
  exit 1
fi
if [ ! -f "app/src/main/java/com/payjoinreactnative/MainApplication.java" ]; then
  echo "MainApplication.java missing. Please add from previous instructions."
  exit 1
fi

# Verify Gradle build
echo "Verifying Android build..."
./gradlew clean build

cd ..