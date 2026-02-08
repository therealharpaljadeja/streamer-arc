export const ARC_DOMAIN = 26;

export const FORWARDING_HOOK_DATA =
  "0x636374702d666f72776172640000000000000000000000000000000000000000" as const;

export interface ChainConfig {
  chainId: number;
  name: string;
  shortName: string;
  domain: number;
  tokenMessengerV2: `0x${string}`;
  usdc: `0x${string}`;
  logo: string;
  rpcUrl: string;
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  11155111: {
    chainId: 11155111,
    name: "Ethereum Sepolia",
    shortName: "Ethereum",
    domain: 0,
    tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
    rpcUrl: "https://rpc.sepolia.org",
  },
  421614: {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    shortName: "Arbitrum",
    domain: 3,
    tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  },
  43113: {
    chainId: 43113,
    name: "Avalanche Fuji",
    shortName: "Avalanche",
    domain: 1,
    tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    usdc: "0x5425890298aed601595a70AB815c96711a31Bc65",
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png",
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  },
  84532: {
    chainId: 84532,
    name: "Base Sepolia",
    shortName: "Base",
    domain: 6,
    tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png",
    rpcUrl: "https://sepolia.base.org",
  },
  11155420: {
    chainId: 11155420,
    name: "OP Sepolia",
    shortName: "Optimism",
    domain: 2,
    tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png",
    rpcUrl: "https://sepolia.optimism.io",
  },
  80002: {
    chainId: 80002,
    name: "Polygon Amoy",
    shortName: "Polygon",
    domain: 7,
    tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    usdc: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
    rpcUrl: "https://rpc-amoy.polygon.technology",
  },
};

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId];
}

export function getChainConfigByName(name: string): ChainConfig | undefined {
  return Object.values(CHAIN_CONFIGS).find((c) => c.name === name);
}

export function padAddressTo32Bytes(address: string): `0x${string}` {
  const cleaned = address.toLowerCase().replace("0x", "");
  return `0x${cleaned.padStart(64, "0")}`;
}
