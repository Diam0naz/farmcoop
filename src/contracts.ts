/**
 * Deployed contract addresses and ABIs for FarmCoop on Arc Testnet.
 * Generated after deployment — do not edit the addresses manually.
 */
import farmCoopArtifact from '../contracts/out/FarmCoop.sol/FarmCoop.json'
import farmCoopVerifierArtifact from '../contracts/out/FarmCoopVerifier.sol/FarmCoopVerifier.json'
import { getUsdc } from '@/onchain-facts'
import { arcTestnet } from 'viem/chains'

export const CHAIN_ID = arcTestnet.id // 5042002

export const FARM_COOP_ADDRESS = '0xada6a79971025aa1d58884ad8620e34f7254d14d' as const
export const FARM_COOP_VERIFIER_ADDRESS = '0x44f1e084b291e7a6ee9950c178047538d330df96' as const
export const COORDINATOR_ADDRESS = '0x5B12Ce46C7194aD57d143bC22847224047b1Ef42' as const

export const USDC_ADDRESS = getUsdc(CHAIN_ID)!.address as `0x${string}`

export const FARM_COOP_EXPLORER = `https://explorer.testnet.arc.io/address/${FARM_COOP_ADDRESS}`
export const VERIFIER_EXPLORER = `https://explorer.testnet.arc.io/address/${FARM_COOP_VERIFIER_ADDRESS}`

export const FARM_COOP = {
  address: FARM_COOP_ADDRESS,
  abi: farmCoopArtifact.abi,
} as const

export const FARM_COOP_VERIFIER = {
  address: FARM_COOP_VERIFIER_ADDRESS,
  abi: farmCoopVerifierArtifact.abi,
} as const

// Minimal ERC-20 ABI for USDC allowance + approval
export const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export function txExplorerUrl(hash: string) {
  return `https://explorer.testnet.arc.io/tx/${hash}`
}
