package com.yourlibrary;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class YourLibraryModule extends ReactContextBaseJavaModule {
    YourLibraryModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "YourLibrary";
    }

    @ReactMethod
    public void sampleMethod(String input, Promise promise) {
        promise.resolve("Android: " + input);
    }
}
