import { useState, type ReactNode } from 'react'
import { clsx } from 'clsx'
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Building2,
  Coins,
  HandCoins,
  Menu,
  Package,
  ShieldCheck,
  Store,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Brand } from '@/components/Brand'
import { WalletCard } from '@/components/WalletCard'
import { useAccount } from 'wagmi'
import { FARM_COOP_ADDRESS, FARM_COOP_EXPLORER } from '@/contracts'

export interface AppTab {
  id: string
  label: string
  description: string
  group: 'Cooperative' | 'Members' | 'Operations' | 'Help'
  icon: LucideIcon
}

export const APP_TABS: AppTab[] = [
  {
    id: 'orders',
    label: 'Orders',
    description: 'Buy inputs together. The coordinator creates the order; buyers fund it and confirm delivery.',
    group: 'Cooperative',
    icon: Package,
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    description: 'Vetted businesses raising money from the pool. Read the milestones, then vote with your shares.',
    group: 'Cooperative',
    icon: Store,
  },
  {
    id: 'pool',
    label: 'Pool',
    description: 'The shared treasury. Deposit USDC for shares, watch NAV move, redeem when capital is idle.',
    group: 'Cooperative',
    icon: Coins,
  },
  {
    id: 'balance',
    label: 'My balance',
    description: 'Patronage you have earned, plus the shares you hold and a route to cash out.',
    group: 'Members',
    icon: Wallet,
  },
  {
    id: 'business',
    label: 'Business',
    description: 'Raise from the co-op: create a listing, submit milestone proof, and repay what you borrow.',
    group: 'Operations',
    icon: Building2,
  },
  {
    id: 'funder',
    label: 'Funder tools',
    description: 'Vote on milestones, reject missed deadlines, flag defaults and clear the withdrawal queue.',
    group: 'Operations',
    icon: HandCoins,
  },
  {
    id: 'coordinator',
    label: 'Coordinator',
    description: 'Admit members, verify listings and move reserve funds — coordinator wallet only.',
    group: 'Operations',
    icon: ShieldCheck,
  },
  {
    id: 'guide',
    label: 'User guide',
    description: 'How the co-op works end to end: who can act on each screen, the rules the contract enforces, and answers to first-visit questions.',
    group: 'Help',
    icon: BookOpen,
  },
]

const GROUPS = ['Cooperative', 'Members', 'Operations', 'Help'] as const

function NavLinks({ tab, onNavigate }: { tab: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-6">
      {GROUPS.map(group => (
        <div key={group}>
          <p className="px-3 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-olive-900/35">
            {group}
          </p>
          <div className="mt-2 space-y-0.5">
            {APP_TABS.filter(t => t.group === group).map(item => {
              const active = item.id === tab
              return (
                <a
                  key={item.id}
                  href={`#/app/${item.id}`}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.84rem] font-medium transition-colors',
                    active
                      ? 'bg-olive-700 text-cream shadow-[0_10px_24px_-18px_rgba(35,42,23,0.9)]'
                      : 'text-olive-900/70 hover:bg-olive-700/8 hover:text-olive-950',
                  )}
                >
                  <item.icon size={15} strokeWidth={1.9} className={active ? 'text-gold' : 'text-olive-800/60'} />
                  {item.label}
                </a>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

function ChainChip() {
  const { chain } = useAccount()
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-olive-700/15 bg-cream-50/70 px-3 py-1.5 text-[0.7rem] font-medium text-olive-900/60">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-soft-pulse rounded-full bg-olive-600" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-olive-700" />
      </span>
      {chain?.name ?? 'Arc Testnet'}
      <span className="text-olive-900/25">·</span>
      <span className="mono text-[0.66rem] text-olive-900/45">USDC</span>
    </div>
  )
}

export function AppShell({ tab, children }: { tab: string; children: ReactNode }) {
  const { isConnected } = useAccount()
  const [drawer, setDrawer] = useState(false)
  const current = APP_TABS.find(t => t.id === tab) ?? APP_TABS[0]
  const groupLabel = current.group

  return (
    <div className="min-h-dvh bg-cream">
      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-[17rem] shrink-0 flex-col border-r border-olive-700/15 bg-cream-200/40 px-4 py-5 lg:flex">
          <div className="px-2">
            <Brand />
            <p className="mt-3 pl-[0.1rem] text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-olive-900/35">
              Co-op dashboard
            </p>
          </div>

          <div className="mt-7 flex-1 overflow-y-auto scrollbar-hide">
            <NavLinks tab={current.id} />
          </div>

          <div className="mt-4 space-y-2.5">
            <WalletCard />
            <a
              href="#/"
              className="flex items-center gap-1.5 px-2 text-[0.74rem] font-medium text-olive-900/50 transition-colors hover:text-olive-950"
            >
              <ArrowLeft size={12} /> Back to the site
            </a>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Mobile bar */}
          <header className="sticky top-0 z-40 border-b border-olive-700/15 bg-cream/95 backdrop-blur-md lg:hidden">
            <div className="flex h-16 items-center gap-3 px-4">
              <Brand />
              <div className="ml-auto flex items-center gap-2">
                <WalletCard compact />
                <button
                  onClick={() => setDrawer(true)}
                  aria-label="Open navigation"
                  className="grid h-9 w-9 place-items-center rounded-full border border-olive-700/20 text-olive-900"
                >
                  <Menu size={17} />
                </button>
              </div>
            </div>
          </header>

          {drawer && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                aria-label="Close navigation"
                onClick={() => setDrawer(false)}
                className="absolute inset-0 bg-olive-950/40 backdrop-blur-sm"
              />
              <div className="absolute inset-y-0 right-0 flex w-[19rem] max-w-[85%] flex-col bg-cream px-5 py-5 shadow-2xl">
                <div className="flex items-center justify-between">
                  <Brand onClick={() => setDrawer(false)} />
                  <button
                    onClick={() => setDrawer(false)}
                    aria-label="Close navigation"
                    className="grid h-9 w-9 place-items-center rounded-full border border-olive-700/20 text-olive-900"
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="mt-6 flex-1 overflow-y-auto">
                  <NavLinks tab={current.id} onNavigate={() => setDrawer(false)} />
                </div>
                <div className="mt-4 space-y-2.5">
                  <WalletCard />
                  <a
                    href="#/"
                    onClick={() => setDrawer(false)}
                    className="flex items-center gap-1.5 px-2 text-[0.74rem] font-medium text-olive-900/50"
                  >
                    <ArrowLeft size={12} /> Back to the site
                  </a>
                </div>
              </div>
            </div>
          )}

          <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:px-8 md:pt-10">
            <header className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-clay">
                  <span className="h-1.5 w-1.5 rounded-full bg-clay" />
                  {groupLabel}
                </p>
                <h1 className="display mt-2.5 text-[clamp(1.8rem,3.6vw,2.5rem)] leading-none text-olive-950">
                  {current.label}
                </h1>
                <p className="mt-2.5 max-w-xl text-[0.9rem] leading-relaxed text-olive-900/60">
                  {current.description}
                </p>
              </div>
              <div className="hidden pb-1 sm:block">
                <ChainChip />
              </div>
            </header>

            {!isConnected && (
              <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-dashed border-olive-700/30 bg-cream-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[0.85rem] font-semibold text-olive-950">No wallet connected</p>
                  <p className="mt-0.5 text-[0.8rem] text-olive-900/60">
                    You can read everything here. Connect to deposit, fund, vote or claim.
                  </p>
                </div>
                <WalletCard compact />
              </div>
            )}

            <div className="mt-7">{children}</div>

            <footer className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-olive-700/15 pt-5 text-[0.68rem] text-olive-900/40">
              <span>FarmCoop · Arc Testnet</span>
              <a
                href={FARM_COOP_EXPLORER}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-olive-900/70"
              >
                Contract <ArrowUpRight size={10} />
              </a>
              <span className="mono truncate">{FARM_COOP_ADDRESS}</span>
            </footer>
          </main>
        </div>
      </div>
    </div>
  )
}
