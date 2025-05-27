# Payjoin React Native

⚠️**Alpha Software**

[![NPM version](https://img.shields.io/npm/v/payjoin-react-native.svg)](https://www.npmjs.com/package/payjoin-react-native)
[![Bitcoin-only](https://img.shields.io/badge/bitcoin-only-FF9900?logo=bitcoin)](https://twentyone.world)

React Native Library to Payjoin

## About

**Payjoin React Native** is a mobile-focused implementation of the Payjoin (P2EP) protocol built with React Native. This library facilitates secure peer-to-peer Bitcoin transactions, enhancing privacy by allowing the payer and payee to contribute inputs to the same transaction. 

The library is fully compatible with Bitcoin Core and other Bitcoin-compatible APIs, making it a versatile solution for integrating Payjoin into mobile applications.

## Key Features

- **Payjoin Protocol Integration**: Implements Payjoin (BIP-78) to enhance privacy by allowing input contributions from both parties in a transaction.
- **Bitcoin Core Support**: Seamlessly integrates with Bitcoin Core nodes for transaction signing, broadcasting, and input/output management.
- **API Compatibility**: Works with Bitcoin-compatible APIs for ease of setup and use without the need for running a full node.
- **React Native Framework**: Built specifically for mobile platforms, leveraging React Native for cross-platform compatibility.
- **Secure and Private**: Enhances privacy by obfuscating input ownership, protecting against blockchain analysis.
- **Easy Setup and Configuration**: User-friendly API to connect and start performing Payjoin transactions with minimal setup.
- **Android and iOS Support**: Supports both Android and iOS platforms, ensuring broad reach and compatibility.

## Main Functions

1. **Transaction Creation**: Easily create Bitcoin transactions with Payjoin support.
2. **Input/Output Management**: Automatically handles UTXO selection for both payer and payee.
3. **Broadcasting Transactions**: Broadcast completed Payjoin transactions to the Bitcoin network using Bitcoin Core or compatible APIs.
4. **Payjoin Communication**: Establish communication between payer and payee using the Payjoin endpoint for seamless integration.
5. **Bitcoin Core RPC Support**: Utilize Bitcoin Core’s RPC interface for advanced transaction handling, fee calculation, and more.
6. **Compatibility with Bitcoin Services**: Connect with third-party Bitcoin APIs for non-full-node setups, providing flexibility for developers.

## Installation

Instructions for installing the package and integrating it into your React Native project will be added here.

```npm
npm i payjoin-react-native
```
or

```yarn
yarn install payjoin-react-native
```

### Contributing

Contributions are welcome! If you would like to contribute to the project, please follow these guidelines:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Write tests for your changes.
4. Submit a pull request with a description of your changes.

### License

This project is licensed under the MIT License.

## Wallets use PRN

- [Firebolt Wallet](https://github.com/AreaLayer/firebolt-react-native)

## Roadmap

- [ ] Web support (PWA) by WASM
- [ ] Beta version
- [x] Payjoin V2
- [ ] Out of beta
