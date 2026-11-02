/**
 * Detects the connected wallet's role(s) in the cooperative.
 * A single address can hold multiple roles simultaneously.
 */
import { useAccount, useReadContract } from 'wagmi'
import { FARM_COOP, COORDINATOR_ADDRESS } from '@/contracts'

export type Role = 'coordinator' | 'member' | 'buyer' | 'business' | 'none'

export function useRole() {
  const { address, isConnected } = useAccount()

  const isCoordinator = isConnected && address?.toLowerCase() === COORDINATOR_ADDRESS.toLowerCase()

  const { data: isMember } = useReadContract({
    ...FARM_COOP,
    functionName: 'isMember',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !isCoordinator },
  })

  return {
    address,
    isConnected,
    isCoordinator: !!isCoordinator,
    isMember: isCoordinator ? true : !!isMember,
    // Buyer and Business are not on-chain roles; anyone can be one.
    // We keep them here for tab visibility logic only.
  }
}
