// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "PayjoinReactNative",
    platforms: [
        .iOS(.v12)
    ],
    products: [
        .library(
            name: "PayjoinReactNative",
            targets: ["PayjoinReactNative"]
        )
    ],
    dependencies: [
        // Add external dependencies here if needed, e.g., Bitcoin libraries
    ],
    targets: [
        .target(
            name: "PayjoinReactNative",
            dependencies: [],
            path: "Sources/PayjoinReactNative",
            sources: [
                "PayjoinModule.swift",
                "PayjoinModule.m"
            ],
            publicHeadersPath: "include",
            cSettings: [
                .headerSearchPath("include")
            ]
        )
    ],
    swiftLanguageVersions: [.v5]
)