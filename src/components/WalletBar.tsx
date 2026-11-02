import { ConnectKitButton } from 'connectkit'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { ERC20_ABI, USDC_ADDRESS } from '@/contracts'
import { Leaf } from 'lucide-react'

export function WalletBar() {
  const { address, isConnected } = useAccount()

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const formattedBalance = usdcBalance !== undefined
    ? parseFloat(formatUnits(usdcBalance, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-md bg-[var(--surface)]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
        <div className="flex items-center gap-2 mr-auto">
          <Leaf size={18} className="text-[var(--success)]" />
          <span className="display font-semibold text-base text-[var(--ink)]">FarmCoop</span>
          <span className="text-xs text-[var(--muted)] hidden sm:inline">Arc Testnet</span>
        </div>

        {isConnected && formattedBalance !== null && (
          <div className="hidden sm:flex items-center gap-1.5 text-sm font-medium tabular-nums text-[var(--ink-2)]">
            <span className="text-[var(--muted)] text-xs">USDC</span>
            <span>{formattedBalance}</span>
          </div>
        )}

        <ConnectKitButton />
      </div>
    </header>
  )
}
