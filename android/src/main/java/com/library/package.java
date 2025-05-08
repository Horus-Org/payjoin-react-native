package com.library;

import com.facebook.react.ReactPackage; import com.facebook.react.bridge.NativeModule; import com.facebook.react.bridge.ReactApplicationContext; import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList; import java.util.Collections; import java.util.List;

public class PayjoinPackage implements ReactPackage { @Override public List createNativeModules(ReactApplicationContext reactContext) { List modules = new ArrayList<>(); modules.add(new PayjoinModule(reactContext)); return modules; }

@Override public List createViewManagers(ReactApplicationContext reactContext) { return Collections.emptyList(); } }