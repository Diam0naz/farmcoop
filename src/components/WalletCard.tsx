import { ConnectKitButton } from 'connectkit'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { ArrowUpRight, Wallet } from 'lucide-react'
import { ERC20_ABI, USDC_ADDRESS } from '@/contracts'

/** Wallet panel used in the app sidebar and mobile drawer. */
export function WalletCard({ compact = false }: { compact?: boolean }) {
  const { address, isConnected } = useAccount()

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const balance =
    usdcBalance !== undefined
      ? parseFloat(formatUnits(usdcBalance, 6)).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null

  if (compact) {
    return (
      <ConnectKitButton.Custom>
        {({ isConnected: connected, show, truncatedAddress, ensName }) => (
          <button
            onClick={show}
            className="inline-flex items-center gap-1.5 rounded-full bg-olive-700 px-3.5 py-2 text-[0.78rem] font-semibold text-cream"
          >
            <Wallet size={13} />
            {connected ? (ensName ?? truncatedAddress) : 'Connect'}
          </button>
        )}
      </ConnectKitButton.Custom>
    )
  }

  return (
    <div className="rounded-2xl border border-olive-700/15 bg-cream-50 p-3.5">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-olive-900/40">Your wallet</span>
        <span className="inline-flex items-center gap-1 text-[0.62rem] font-medium uppercase tracking-[0.1em] text-olive-800/50">
          <span className="h-1 w-1 rounded-full bg-olive-600" /> Arc
        </span>
      </div>

      {isConnected ? (
        <>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="num text-[1.35rem] font-semibold leading-none text-olive-950">
              {balance ?? '—'}
            </span>
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-olive-900/40">
              USDC
            </span>
          </div>
          <p className="mono mt-1 truncate text-[0.66rem] text-olive-900/45">
            {address}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <ConnectKitButton.Custom>
              {({ show, truncatedAddress, ensName }) => (
                <button
                  onClick={show}
                  className="flex-1 truncate rounded-full border border-olive-700/20 px-3 py-1.5 text-[0.72rem] font-semibold text-olive-900 transition-colors hover:bg-olive-700/8"
                >
                  {ensName ?? truncatedAddress}
                </button>
              )}
            </ConnectKitButton.Custom>
            <a
              href="https://explorer.testnet.arc.io"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Arc explorer"
              className="grid h-7 w-7 place-items-center rounded-full border border-olive-700/20 text-olive-800 transition-colors hover:bg-olive-700/8"
            >
              <ArrowUpRight size={13} />
            </a>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-[0.78rem] leading-snug text-olive-900/60">
            Connect a wallet to fund orders, deposit into the pool, and claim patronage.
          </p>
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button onClick={show} className="btn-olive btn-sm btn-block mt-3">
                <Wallet size={14} />
                Connect wallet
              </button>
            )}
          </ConnectKitButton.Custom>
        </>
      )}
    </div>
  )
}
