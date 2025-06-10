import { NativeModules } from 'react-native';
const { Payjoin } = NativeModules;

export const processPayjoin = async (psbt: string, destination: string): Promise<string> => {
  return Payjoin.processPayjoin(psbt, destination);
};