/**
 * User guide — what every surface in the co-op does, who can act on it, and the
 * onchain rules that decide what happens next.
 */
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Coins,
  HandCoins,
  Package,
  ShieldCheck,
  Store,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import { scrollToId } from '@/lib/router'

const CONTENTS = [
  { id: 'start', label: 'Quick start' },
  { id: 'paths', label: 'Find your path' },
  { id: 'walkthroughs', label: 'Screen by screen' },
  { id: 'rules', label: 'The rules' },
  { id: 'faq', label: 'Questions' },
  { id: 'glossary', label: 'Glossary' },
]

const QUICK_START: { title: string; body: string }[] = [
  {
    title: 'Join the co-op',
    body: 'Sign up on the site, then the coordinator adds your wallet as a member. Membership is recorded onchain — it is what lets you deposit, vote and claim.',
  },
  {
    title: 'Connect and deposit',
    body: 'Open Pool, approve USDC, then deposit. You receive shares at the current price per share, priced from idle USDC plus capital lent to businesses.',
  },
  {
    title: 'Put the pool to work',
    body: 'Vote on verified businesses in the Marketplace, or take part in a produce order the coordinator has created for a group of buyers.',
  },
  {
    title: 'Get paid',
    body: 'Settled orders pay 85% of the price to members by quantity delivered. Claim it in My balance, then redeem your shares whenever the pool has idle cash.',
  },
]

const PATHS: { tab: string; label: string; icon: LucideIcon; body: string }[] = [
  {
    tab: 'orders',
    label: 'I farm or buy inputs',
    icon: Package,
    body: 'Your buyer wallet funds orders and confirms delivery. Quantities the coordinator records against your address decide your patronage.',
  },
  {
    tab: 'pool',
    label: 'I am here to fund',
    icon: Coins,
    body: 'Deposit into the pool, then read listings and vote on them. Your ballot weight is capped so no wallet can carry a room.',
  },
  {
    tab: 'business',
    label: 'I run a business',
    icon: Building2,
    body: 'Create a listing with milestones, submit proof as you deliver, and repay principal plus the profit share you promised.',
  },
  {
    tab: 'coordinator',
    label: 'I coordinate',
    icon: ShieldCheck,
    body: 'Admit members, verify listings and move reserve funds. Every action leaves a public trace and stays inside the rules.',
  },
]

const WALKTHROUGHS: {
  tab: string
  title: string
  icon: LucideIcon
  who: string
  steps: string[]
  note?: string
}[] = [
  {
    tab: 'orders',
    title: 'Orders',
    icon: Package,
    who: 'Coordinator creates · buyer funds and confirms',
    steps: [
      'The coordinator creates an order with the buyer, a price in USDC and an expected quantity. It starts as Pending.',
      'The buyer approves USDC and funds the order. Only the buyer named on the order can do this. Status becomes Funded.',
      'The coordinator records what each member received. Status becomes DeliveryRecorded.',
      'The buyer confirms delivery. The price is split 5% to the reserve, 10% to the pool and 85% to members in proportion to quantity delivered.',
    ],
    note: 'Patronage lands as a claimable balance — it does not transfer itself. Claim it from My balance.',
  },
  {
    tab: 'pool',
    title: 'Pool',
    icon: Coins,
    who: 'Members only for deposits',
    steps: [
      'Approve USDC, then deposit. You are issued shares at the current price per share.',
      'Pool value is idle USDC plus the capital currently lent to listings, so the price per share moves as listings are funded and repaid.',
      'Redeeming is paid instantly when the pool holds enough idle USDC.',
      'If the pool is fully lent out, your redemption joins a first-in-first-out queue and is filled as repayments arrive.',
    ],
    note: 'The queue is processed from Funder tools — anyone can trigger it, and it always pays the oldest request first.',
  },
  {
    tab: 'marketplace',
    title: 'Marketplace',
    icon: Store,
    who: 'Businesses list · members vote',
    steps: [
      'A business creates a listing: funding target, funding period, profit share and two to four milestones adding up to 100%.',
      'The coordinator verifies the listing. Votes only count once a listing is verified.',
      'Members vote yes or no with their shares. One ballot per member per listing, weighted at most 15% of all shares.',
      'After the three-day window anyone can finalise. It passes with 20% turnout and more yes than no — then the pool funds the target in full.',
    ],
    note: 'A passed listing must also fit the exposure limit: no single target larger than 30% of total pool value, and the pool must hold enough idle USDC to pay it.',
  },
  {
    tab: 'balance',
    title: 'My balance',
    icon: Wallet,
    who: 'Any member',
    steps: [
      'Claimable patronage from settled orders is listed here — claim it to your wallet.',
      'Your share balance shows what it is worth at the current price per share.',
      'Redeem shares from here when you want out; the same queue rules apply.',
    ],
  },
  {
    tab: 'business',
    title: 'Business',
    icon: Building2,
    who: 'The business wallet on the listing',
    steps: [
      'Create a listing: name, description, target, funding period, profit share in basis points (1200 = 12%), optional docs hash, and milestones.',
      'Once funded, submit proof for the current milestone before its deadline. Later milestones cannot be submitted early.',
      'Members vote on the proof; at 20% approval the milestone pays out after the 24-hour timelock, and the next one opens.',
      'Repay by approving USDC and sending a repayment. Principal returns to pool value, the profit share is your cost of the loan.',
    ],
    note: 'A listing is Completed once repayments reach the target plus the profit share.',
  },
  {
    tab: 'funder',
    title: 'Funder tools',
    icon: HandCoins,
    who: 'Any member',
    steps: [
      'Vote a milestone up or down after the business submits proof.',
      'Reject a milestone once its voting window closes without quorum — the listing is then marked as defaulted.',
      'Flag a default when the current milestone deadline has passed with no approval.',
      'Mark a loss on a defaulted listing: unreleased funds return to the pool, then the unrecovered remainder is written down.',
      'Process the withdrawal queue to pay out members waiting to redeem.',
    ],
  },
  {
    tab: 'coordinator',
    title: 'Coordinator',
    icon: ShieldCheck,
    who: 'Coordinator wallet only',
    steps: [
      'Add or remove member wallets.',
      'Verify a listing through the verifier contract so its vote can count.',
      'Withdraw reserve funds — the 5% cut of every settled order plus rounding dust — to a named address.',
    ],
    note: 'The coordinator cannot mint shares, skip the timelock, or move pool capital without a member vote. Opening this tab with another wallet only shows a locked notice.',
  },
]

const RULES: { value: string; label: string; body: string }[] = [
  { value: '85 / 10 / 5', label: 'Order settlement', body: 'Of every settled order price: 85% to members, 10% to the pool, 5% to the reserve.' },
  { value: '20%', label: 'Quorum', body: 'Share of all shares that must vote before a listing or milestone can pass.' },
  { value: '3 days', label: 'Voting window', body: 'Time a listing or a milestone vote stays open.' },
  { value: '24h', label: 'Timelock', body: 'Delay after funding before the first milestone can release money.' },
  { value: '15%', label: 'Vote cap', body: 'The most of total shares any single wallet can swing in one vote.' },
  { value: '30%', label: 'Exposure', body: 'No single listing may exceed this share of total pool value.' },
]

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Why can’t I deposit or vote?',
    a: 'Both require membership, which the coordinator grants to a wallet address. Deposits are member-only, and votes additionally need shares and — for listings — a verified business.',
  },
  {
    q: 'My redemption shows as queued. What now?',
    a: 'The pool’s capital is lent out to listings. Requests are paid oldest-first as repayments come in, and anyone can process the queue from Funder tools. You can only have one request in the queue at a time.',
  },
  {
    q: 'Why did funding fail after a vote passed?',
    a: 'Two limits sit on top of the vote: a listing can be at most 30% of total pool value, and the pool must hold enough idle USDC to pay the target in full. If either fails, the listing stays unfunded.',
  },
  {
    q: 'Why is my transaction asking for two approvals?',
    a: 'Any action that pulls USDC — funding an order, depositing, repaying — first needs an ERC-20 approval for the co-op contract, then the action itself.',
  },
  {
    q: 'What happens if a business misses a deadline?',
    a: 'Any member can flag the default once the deadline passes. Unreleased funds are returned to the pool, and a member can mark the loss so the unrecovered remainder is written down against pool value.',
  },
  {
    q: 'Is this real money?',
    a: 'FarmCoop runs on Arc Testnet with test USDC. Every flow works end to end, but treat balances as practice until the co-op launches on mainnet.',
  },
]

const GLOSSARY: { term: string; body: string }[] = [
  { term: 'Share', body: 'Your unit of the pool. Deposit USDC to receive shares; redeem them for USDC at the current price.' },
  { term: 'Price per share', body: 'Pool value divided by total shares. Starts at 1.000000 USDC and moves with lending and repayment.' },
  { term: 'Patronage', body: 'The member share of a settled order, allocated by quantity delivered rather than by shares held.' },
  { term: 'Reserve', body: 'A buffer funded by 5% of each settled order, spendable by the coordinator on the co-op’s behalf.' },
  { term: 'Milestone', body: 'A staged slice of a listing’s funding, released to the business only after member-approved proof.' },
  { term: 'Quorum', body: 'The turnout a vote needs before its result counts, measured in shares.' },
  { term: 'Timelock', body: 'A mandatory waiting period between funding a listing and releasing its first milestone.' },
  { term: 'Default', body: 'A listing marked after a missed milestone deadline or a rejected milestone. It can no longer receive funds.' },
  { term: 'Withdrawal queue', body: 'First-in-first-out line for redemptions the pool cannot pay immediately.' },
]

function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  intro?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <p className="eyebrow text-clay">
        <span className="h-1.5 w-1.5 rounded-full bg-clay" />
        {eyebrow}
      </p>
      <h2 className="display mt-2 text-[1.45rem] leading-tight text-olive-950">{title}</h2>
      {intro && <p className="mt-2 max-w-2xl text-[0.9rem] leading-relaxed text-olive-900/60">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

export function GuidePage() {
  return (
    <div className="space-y-12">
      {/* Contents */}
      <div className="flex flex-wrap gap-2">
        {CONTENTS.map(item => (
          <button
            key={item.id}
            onClick={() => scrollToId(item.id)}
            className="rounded-full border border-olive-700/20 bg-cream-50/70 px-3.5 py-1.5 text-[0.76rem] font-semibold text-olive-900/70 transition-colors hover:bg-olive-700/8 hover:text-olive-950"
          >
            {item.label}
          </button>
        ))}
      </div>

      <Section
        id="start"
        eyebrow="Quick start"
        title="From a wallet to a working share"
        intro="Four steps is enough to go from an empty wallet to a share in the pool and a claim on the next settled order."
      >
        <ol className="grid gap-3 sm:grid-cols-2">
          {QUICK_START.map((step, i) => (
            <li
              key={step.title}
              className="rounded-2xl border border-olive-700/15 bg-cream-50 p-5"
            >
              <span className="num grid h-7 w-7 place-items-center rounded-full bg-olive-700 text-[0.78rem] font-semibold text-cream">
                {i + 1}
              </span>
              <h3 className="mt-3 text-[0.92rem] font-semibold text-olive-950">{step.title}</h3>
              <p className="mt-1.5 text-[0.82rem] leading-relaxed text-olive-900/60">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="paths"
        eyebrow="Find your path"
        title="Pick the screen that matches your role"
        intro="Everyone in the co-op holds the same member role. What changes is which parts of the app you actually use."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {PATHS.map(path => (
            <a
              key={path.tab}
              href={`#/app/${path.tab}`}
              className="group flex items-start gap-3 rounded-2xl border border-olive-700/15 bg-cream-50 p-5 transition-colors hover:border-olive-700/30 hover:bg-cream-100"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-olive-700/10 text-olive-800">
                <path.icon size={16} strokeWidth={1.9} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[0.9rem] font-semibold text-olive-950">
                  {path.label}
                  <ArrowRight size={13} className="text-olive-800/40 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-1 block text-[0.8rem] leading-relaxed text-olive-900/60">{path.body}</span>
              </span>
            </a>
          ))}
        </div>
      </Section>

      <Section
        id="walkthroughs"
        eyebrow="Screen by screen"
        title="What each screen lets you do"
        intro="Who can act, in what order, and what the status labels mean as you go."
      >
        <div className="space-y-3">
          {WALKTHROUGHS.map(walk => (
            <div key={walk.tab} className="rounded-2xl border border-olive-700/15 bg-cream-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-olive-700/10 text-olive-800">
                    <walk.icon size={15} strokeWidth={1.9} />
                  </span>
                  <div>
                    <h3 className="text-[0.95rem] font-semibold text-olive-950">{walk.title}</h3>
                    <p className="text-[0.7rem] uppercase tracking-[0.12em] text-olive-900/40">{walk.who}</p>
                  </div>
                </div>
                <a
                  href={`#/app/${walk.tab}`}
                  className="inline-flex items-center gap-1 rounded-full border border-olive-700/20 px-3 py-1 text-[0.72rem] font-semibold text-olive-800 transition-colors hover:bg-olive-700/8"
                >
                  Open
                  <ArrowRight size={11} />
                </a>
              </div>

              <ol className="mt-4 space-y-2.5">
                {walk.steps.map((step, i) => (
                  <li key={step} className="flex gap-2.5">
                    <span className="mono mt-0.5 shrink-0 text-[0.66rem] font-semibold text-olive-700/50">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[0.83rem] leading-relaxed text-olive-900/70">{step}</span>
                  </li>
                ))}
              </ol>

              {walk.note && (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-olive-700/8 px-3 py-2.5 text-[0.76rem] leading-relaxed text-olive-900/65">
                  <BookOpen size={13} className="mt-0.5 shrink-0 text-olive-700" />
                  {walk.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="rules"
        eyebrow="The rules"
        title="The numbers written into the contract"
        intro="These are constructor parameters of the deployed contract on Arc Testnet, not settings anyone can change later."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map(rule => (
            <div key={rule.label} className="rounded-2xl border border-olive-700/15 bg-cream-50 p-4">
              <p className="num text-[1.35rem] font-semibold leading-none text-olive-950">{rule.value}</p>
              <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-clay">{rule.label}</p>
              <p className="mt-1.5 text-[0.78rem] leading-relaxed text-olive-900/60">{rule.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="faq" eyebrow="Questions" title="The things people ask first">
        <div className="divide-y divide-olive-700/12 overflow-hidden rounded-2xl border border-olive-700/15 bg-cream-50">
          {FAQS.map(faq => (
            <details key={faq.q} className="group px-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[0.86rem] font-semibold text-olive-950">
                {faq.q}
                <span className="text-olive-800/40 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pb-4 text-[0.83rem] leading-relaxed text-olive-900/65">{faq.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section id="glossary" eyebrow="Glossary" title="The words the co-op uses">
        <dl className="grid gap-3 sm:grid-cols-2">
          {GLOSSARY.map(item => (
            <div
              key={item.term}
              className={clsx(
                'rounded-2xl border border-olive-700/15 bg-cream-50 p-4',
                'sm:last:col-span-2',
              )}
            >
              <dt className="flex items-center gap-1.5 text-[0.86rem] font-semibold text-olive-950">
                <CheckCircle2 size={13} className="text-olive-700/60" />
                {item.term}
              </dt>
              <dd className="mt-1 text-[0.79rem] leading-relaxed text-olive-900/60">{item.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <p className="border-t border-olive-700/15 pt-5 text-[0.74rem] leading-relaxed text-olive-900/45">
        Every action described here is a transaction on Arc Testnet — you can follow any of them from the
        contract link below. Balances are test USDC.
      </p>
    </div>
  )
}
