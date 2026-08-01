export interface WalletCreateResponse {
  address: string;
  encryptedKeyMaterial: string;
  chainId: number;
  rpcUrl: string;
  message: string;
}

export interface WalletBalanceResponse {
  address: string;
  balance: string;
  chainId: number;
}
