import { useState } from 'react'
import { useAccount } from 'wagmi'
import { WalletBar } from '@/components/WalletBar'
import { OrdersPage } from '@/pages/OrdersPage'
import { BalancePage } from '@/pages/BalancePage'
import { PoolPage } from '@/pages/PoolPage'
import { MarketplacePage } from '@/pages/MarketplacePage'
import { BusinessDashboard } from '@/pages/BusinessDashboard'
import { FunderView } from '@/pages/FunderView'
import { CoordinatorPanel } from '@/pages/CoordinatorPanel'
import { FARM_COOP_ADDRESS, FARM_COOP_EXPLORER } from '@/contracts'
import { ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'

const TABS = [
  { id: 'orders',      label: 'Orders' },
  { id: 'balance',     label: 'My Balance' },
  { id: 'pool',        label: 'Pool' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'business',    label: 'Business' },
  { id: 'funder',      label: 'Funder' },
  { id: 'coordinator', label: 'Coordinator' },
] as const

type TabId = typeof TABS[number]['id']

export default function App() {
  const { isConnected } = useAccount()
  const [tab, setTab] = useState<TabId>('orders')

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      <WalletBar />

      {/* Tab bar */}
      <div className="sticky top-14 z-40 border-b border-[var(--border)] bg-[var(--surface)] backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  tab === t.id
                    ? 'border-[var(--accent)] text-[var(--ink)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink-2)]'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {!isConnected && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center mb-6">
            <p className="display text-lg font-semibold text-[var(--ink)]">FarmCoop</p>
            <p className="text-sm text-[var(--muted)] mt-1 mb-4">
              A decentralized farm cooperative on Arc Testnet. Connect your wallet to participate.
            </p>
            <div className="text-xs text-[var(--subtle)] space-y-1">
              <div>Contract: <span className="mono">{FARM_COOP_ADDRESS}</span></div>
              <a href={FARM_COOP_EXPLORER} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--accent-hover)] hover:underline">
                <ExternalLink size={11} /> View on Arc Explorer
              </a>
            </div>
          </div>
        )}

        {tab === 'orders'      && <OrdersPage />}
        {tab === 'balance'     && <BalancePage />}
        {tab === 'pool'        && <PoolPage />}
        {tab === 'marketplace' && <MarketplacePage />}
        {tab === 'business'    && <BusinessDashboard />}
        {tab === 'funder'      && <FunderView />}
        {tab === 'coordinator' && <CoordinatorPanel />}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 pb-8 pt-2">
        <div className="text-xs text-[var(--subtle)] flex flex-wrap gap-x-4 gap-y-1 items-center">
          <span>FarmCoop &middot; Arc Testnet</span>
          <a href={FARM_COOP_EXPLORER} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-[var(--accent-hover)] transition-colors">
            <ExternalLink size={10} /> FarmCoop contract
          </a>
          <span className="mono">{FARM_COOP_ADDRESS}</span>
        </div>
      </footer>
    </div>
  )
}
