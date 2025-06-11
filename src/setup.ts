

import { createPublicClient, createWalletClient, defineChain, formatEther, http, parseEther, getContract } from 'viem'
import dotenv from 'dotenv'
import { privateKeyToAccount } from 'viem/accounts'
import { isHex, isAddress } from 'viem'
import { abi } from './abi'

// Load environment variables
dotenv.config()
if (!process.env.RPC_URL) {
  throw new Error('RPC_URL is not set')
}
if (!process.env.PRIVATE_KEY || !isHex(process.env.PRIVATE_KEY)) {
  throw new Error('PRIVATE_KEY is not set')
}
if (!process.env.CONTRACT_ADDRESS || !isAddress(process.env.CONTRACT_ADDRESS)) {
  throw new Error('CONTRACT_ADDRESS is not set')
}
if (!process.env.CHAIN_ID) {
  throw new Error('CHAIN_ID is not set')
}


const local = defineChain({
  id: parseInt(process.env.CHAIN_ID),
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [process.env.RPC_URL] },
  },
})

export const publicClient = createPublicClient({
  chain: local,
  transport: http(),
})

export const account = privateKeyToAccount(process.env.PRIVATE_KEY)

export const walletClient = createWalletClient({
  chain: local,
  transport: http(),
  account: account,
})

export const contract = getContract({
  address: process.env.CONTRACT_ADDRESS,
  abi: abi,
  client: {
    public: publicClient,
    wallet: walletClient,
  },
})

