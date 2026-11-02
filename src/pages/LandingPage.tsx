/**
 * Marketing site — the front door before the app.
 * Warm cream paper, deep olive ink, 70s liquid display type.
 */
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Wallet,
  Package,
  Store,
  Coins,
  Users,
  ShieldCheck,
  Menu,
  X,
  Plus,
} from 'lucide-react'
import { Brand, BrandMark, CoopStamp } from '@/components/Brand'
import { Reveal } from '@/components/Reveal'
import { navigate, scrollToId } from '@/lib/router'
import { FARM_COOP_ADDRESS, FARM_COOP_EXPLORER, FARM_COOP_VERIFIER_ADDRESS, VERIFIER_EXPLORER } from '@/contracts'

const NAV_LINKS = [
  { label: 'Why a co-op', id: 'why' },
  { label: 'How it works', id: 'how' },
  { label: 'The app', id: 'app' },
  { label: 'The rulebook', id: 'rules' },
  { label: 'Questions', id: 'faq' },
]

const MARQUEE = ['Pool it', 'Vote it', 'Fund it', 'Share it']

const PRINCIPLES = [
  {
    n: '01',
    title: 'Money stays in the parish',
    body: 'Pooled USDC funds the businesses your neighbours actually run — not a lender three time zones away.',
  },
  {
    n: '02',
    title: 'One member, one voice',
    body: 'Nothing gets funded without a quorum, and every vote is a public transaction you can re-read later.',
  },
  {
    n: '03',
    title: 'Rules, not relationships',
    body: 'Reserve, quorum, timelock and exposure caps are fixed at deploy. Nobody can move the goalposts mid-season.',
  },
]

const RULES = [
  { value: '5%', label: 'Reserve', copy: 'Every order tucks a little away for the co-op itself.' },
  { value: '10%', label: 'Pool cushion', copy: 'A buffer so redemptions keep flowing.' },
  { value: '85%', label: 'Patronage', copy: 'The rest flows back to the members who earned it.' },
  { value: '20%', label: 'Quorum', copy: 'The share of the pool that must turn out to fund a listing.' },
]

const GUARDS = [
  { k: '3 days', v: 'Voting window on every listing' },
  { k: '24 hours', v: 'Timelock before funds leave' },
  { k: '30%', v: 'Maximum exposure to a single business' },
  { k: '15%', v: 'Vote cap, so no whale runs the room' },
]

const STEPS = [
  {
    n: '01',
    title: 'Join the roll',
    body: 'Create your member profile, connect a wallet, get added to the cooperative roll by the coordinator.',
  },
  {
    n: '02',
    title: 'Put money in the pool',
    body: 'Deposit USDC and receive shares at the live net asset value. Redeem whenever the pool is liquid.',
  },
  {
    n: '03',
    title: 'Fund what you believe in',
    body: 'Verified businesses list what they need. Members vote; the pool funds the ones that clear quorum.',
  },
  {
    n: '04',
    title: 'Get paid when it works',
    body: 'Repayments lift the share price. Produce orders settle patronage straight to your balance.',
  },
]

const PRODUCTS = [
  {
    tab: 'orders',
    icon: Package,
    title: 'Orders',
    body: 'Buy seed, feed and fertiliser together at co-op prices. Coordinator records delivery; you confirm and settle.',
    meta: 'Bulk buying desk',
  },
  {
    tab: 'pool',
    icon: Coins,
    title: 'Pool',
    body: 'Deposit USDC for shares, watch NAV move, redeem when the co-op has idle capital.',
    meta: 'Shared treasury',
  },
  {
    tab: 'marketplace',
    icon: Store,
    title: 'Marketplace',
    body: 'Browse vetted businesses raising money, read their milestones, and vote with your shares.',
    meta: 'Vetted listings',
  },
  {
    tab: 'balance',
    icon: Wallet,
    title: 'Balance',
    body: 'Claim patronage, see what your shares are worth, and cash out to local currency when you want.',
    meta: 'Your payout',
  },
]

const FAQS = [
  {
    q: 'Is my money locked up forever?',
    a: 'No. Pool shares can be redeemed at net asset value. If the co-op is fully lent out, your redemption is queued and processed as capital returns — the queue is visible to everyone.',
  },
  {
    q: 'Who decides what gets funded?',
    a: 'Members, with their shares. A verified listing opens a three-day vote. It only proceeds if at least 20% of the pool turns out and the yes vote wins. Every ballot is an onchain transaction.',
  },
  {
    q: 'What can the coordinator do — and not do?',
    a: 'The coordinator can add members, verify businesses, record deliveries and trigger payouts inside the rules. They cannot mint shares, skip the timelock, or spend the reserve on themselves without an onchain trace.',
  },
  {
    q: 'Do I need to be a farmer?',
    a: 'No. Farmers, buyers, funders and local businesses all hold the same member role. What changes is which parts of the app you actually use.',
  },
  {
    q: 'Is this real money?',
    a: 'FarmCoop is live on Arc Testnet with test USDC. Everything works end to end — deposits, votes, payouts — but treat the balances as practice until the co-op launches on mainnet.',
  },
]

/* ------------------------------------------------------------------ */

function SiteNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const jump = (id: string) => {
    setOpen(false)
    scrollToId(id)
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-olive-700/15 bg-cream/90 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center gap-6 px-5">
        <Brand onClick={() => setOpen(false)} />

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map(link => (
            <button
              key={link.id}
              onClick={() => jump(link.id)}
              className="rounded-full px-3.5 py-2 text-[0.83rem] font-medium text-olive-800/80 transition-colors hover:bg-olive-700/8 hover:text-olive-950"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <a
            href="#/app/orders"
            className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-[0.83rem] font-semibold text-olive-800 transition-colors hover:text-olive-950 sm:inline-flex"
          >
            Open app
            <ArrowUpRight size={14} />
          </a>
          <a href="#/signup" className="btn-olive btn-sm hidden sm:inline-flex">
            Join the co-op
          </a>
          <button
            onClick={() => setOpen(o => !o)}
            className="grid h-10 w-10 place-items-center rounded-full border border-olive-700/20 text-olive-900 lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-olive-700/15 bg-cream/98 px-5 pb-5 pt-3 backdrop-blur-md lg:hidden">
          <div className="flex flex-col">
            {NAV_LINKS.map(link => (
              <button
                key={link.id}
                onClick={() => jump(link.id)}
                className="border-b border-olive-700/10 py-3 text-left text-sm font-medium text-olive-900"
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <a href="#/app/orders" onClick={() => setOpen(false)} className="btn-outline btn-sm flex-1">
              Open app
            </a>
            <a href="#/signup" className="btn-olive btn-sm flex-1">
              Join the co-op
            </a>
          </div>
        </div>
      )}
    </header>
  )
}

function Hero() {
  return (
    <section className="paper grain relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-olive-700/10" />
      <div className="absolute -right-24 top-10 hidden h-[34rem] w-[34rem] rounded-full border border-olive-700/10 md:block" />
      <div className="absolute -right-10 top-32 hidden h-[26rem] w-[26rem] rounded-full border border-olive-700/10 md:block" />

      <div className="relative mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-12 md:pb-28 md:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-olive-700/20 bg-cream-soft/70 px-3 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-olive-600 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-olive-700" />
            </span>
            <span className="eyebrow text-olive-800">Member-owned · live on Arc Testnet</span>
          </div>

          <h1 className="mt-7">
            <span className="display block text-[clamp(3rem,8.2vw,6rem)] text-olive-950">
              Grow more.
            </span>
            <span className="display block text-[clamp(3rem,8.2vw,6rem)] text-olive-700">
              Own more.
            </span>
            <span className="editorial block text-[clamp(3.4rem,9vw,6.6rem)] leading-[0.92] text-clay">
              Together.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-olive-900/75">
            FarmCoop turns a village savings circle into public code. Pool USDC with people you
            trust, fund the businesses your neighbours run, and take your share of the upside — no
            bank, no middleman, no ledger you can&rsquo;t read.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#/signup" className="btn-olive group">
              Join the co-op
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </a>
            <button onClick={() => scrollToId('how')} className="btn-outline">
              See how it works
            </button>
          </div>

          <dl className="mt-11 grid max-w-lg grid-cols-3 gap-4 border-t border-olive-700/15 pt-5">
            {[
              { k: 'USDC', v: 'Deposits held' },
              { k: '24h', v: 'Timelock' },
              { k: '85%', v: 'To patrons' },
            ].map(item => (
              <div key={item.k}>
                <dt className="num text-lg font-semibold text-olive-950">{item.k}</dt>
                <dd className="mt-0.5 text-[0.72rem] uppercase tracking-[0.14em] text-olive-800/55">
                  {item.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Share certificate */}
        <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
          <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-gold/25 blur-2xl" />
          <div className="absolute inset-x-6 bottom-0 h-40 rounded-full bg-olive-700/10 blur-3xl" />

          <Reveal className="relative">
            <div className="relative rotate-[-1.6deg] rounded-[1.75rem] border border-olive-700/25 bg-cream-soft p-6 shadow-[0_30px_70px_-40px_rgba(35,42,23,0.7)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow text-olive-800/60">Share certificate</p>
                  <p className="mt-1 text-[0.7rem] font-medium tracking-[0.18em] text-olive-800/45">
                    NO. 0001 · ARC TESTNET
                  </p>
                </div>
                <BrandMark className="h-10 w-10" />
              </div>

              <p className="display mt-6 text-[2.6rem] leading-none text-olive-950">One share.</p>
              <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-olive-800/70">
                An equal voice in every vote — capped at 15% of the pool, so no single wallet can
                carry a room.
              </p>

              <div className="mt-6 space-y-2.5 border-t border-olive-700/15 pt-4 text-sm">
                {[
                  ['Price per share', '1.000000 USDC'],
                  ['Issued by', 'the co-op itself'],
                  ['Redemption', 'queued if illiquid'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4">
                    <span className="text-olive-800/55">{k}</span>
                    <span className="num font-medium text-olive-900">{v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-2 rounded-xl bg-olive-700/8 px-3 py-2.5">
                <ShieldCheck size={15} className="shrink-0 text-olive-700" />
                <p className="text-[0.72rem] leading-snug text-olive-800/75">
                  Every rule that governs this certificate is readable onchain.
                </p>
              </div>
            </div>

            <div className="absolute -bottom-10 -right-6 rounded-full border border-olive-700/20 bg-cream/70 p-1 backdrop-blur-sm">
              <CoopStamp className="h-[6.5rem] w-[6.5rem] text-olive-700" />
            </div>
          </Reveal>
        </div>
      </div>

      <Marquee />
    </section>
  )
}

function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-olive-950/40 bg-olive-800 py-3.5">
      <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap">
        {[0, 1].map(loop => (
          <div key={loop} className="flex items-center gap-8" aria-hidden={loop === 1}>
            {MARQUEE.map(word => (
              <span key={word + loop} className="flex items-center gap-8">
                <span className="display text-[1.35rem] text-cream/90">{word}</span>
                <span className="text-[0.9rem] text-gold">✳</span>
              </span>
            ))}
            <span className="display text-[1.35rem] text-cream/90">Grow together</span>
            <span className="text-[0.9rem] text-gold">✳</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Why() {
  return (
    <section id="why" className="relative scroll-mt-24 bg-cream py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
        <Reveal>
          <p className="eyebrow text-clay">
            <span className="h-1.5 w-1.5 rounded-full bg-clay" /> Why a co-op
          </p>
          <h2 className="display mt-5 text-[clamp(2.2rem,4.6vw,3.6rem)] text-olive-950">
            A farm&rsquo;s best lender
            <br />
            has always been
            <br />
            <span className="editorial text-clay">the next farm over.</span>
          </h2>
          <p className="mt-6 max-w-md text-[1.0625rem] leading-relaxed text-olive-900/70">
            Cooperative money is older than banking. What it never had was a ledger everyone could
            see, a treasurer nobody could override, and a payout that settled the same afternoon.
          </p>
          <p className="mt-4 max-w-md text-[1.0625rem] leading-relaxed text-olive-900/70">
            FarmCoop is that ledger. The circle stays the same size it always was — it just stops
            depending on who&rsquo;s holding the notebook.
          </p>
          <a
            href={FARM_COOP_EXPLORER}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-olive-800 underline decoration-olive-700/30 decoration-1 underline-offset-4 transition-colors hover:text-olive-950 hover:decoration-olive-700"
          >
            Read the co-op contract
            <ArrowUpRight size={14} />
          </a>
        </Reveal>

        <div className="space-y-3">
          {PRINCIPLES.map((item, i) => (
            <Reveal key={item.n} delay={i * 90}>
              <div className="group flex gap-5 rounded-3xl border border-olive-700/15 bg-cream-soft/70 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-olive-700/30 hover:bg-cream-50 hover:shadow-[0_24px_50px_-40px_rgba(35,42,23,0.8)]">
                <span className="display shrink-0 text-[1.5rem] leading-none text-clay/80">
                  {item.n}
                </span>
                <div>
                  <h3 className="text-[1.0625rem] font-semibold text-olive-950">{item.title}</h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-olive-900/65">
                    {item.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}

          <Reveal delay={280}>
            <div className="flex items-center gap-4 rounded-3xl bg-olive-800 p-6 text-cream">
              <div className="flex -space-x-2">
                {['#F4EDE6', '#CFD7BB', '#C09A57'].map(c => (
                  <span
                    key={c}
                    className="grid h-8 w-8 place-items-center rounded-full border-2 border-olive-800"
                    style={{ background: c }}
                  >
                    <Users size={12} className="text-olive-900" />
                  </span>
                ))}
              </div>
              <p className="text-sm leading-snug text-cream/80">
                Farmers, buyers, funders and local businesses — all one member role. Same rights,
                same vote.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Rules() {
  return (
    <section id="rules" className="relative scroll-mt-24 overflow-hidden bg-olive-900 py-20 text-cream md:py-28">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16]">
        <div className="absolute -left-20 top-10 h-80 w-80 rounded-full border border-cream/40" />
        <div className="absolute -left-8 top-24 h-56 w-56 rounded-full border border-cream/40" />
        <div className="absolute -right-24 bottom-0 h-[26rem] w-[26rem] rounded-full border border-cream/30" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" /> The rulebook
          </p>
          <h2 className="display mt-5 text-[clamp(2.2rem,4.6vw,3.6rem)] text-cream">
            The split is written
            <br />
            <span className="editorial text-gold">before the season starts.</span>
          </h2>
          <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-cream/70">
            No annual meeting required. These are constructor parameters, deployed once, visible to
            anyone with a browser.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {RULES.map((rule, i) => (
            <Reveal key={rule.label} delay={i * 80}>
              <div className="border-t border-cream/20 pt-4">
                <p className="display text-[3.4rem] leading-none text-cream">{rule.value}</p>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-gold">
                  {rule.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-cream/60">{rule.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-cream/15 bg-cream/15 sm:grid-cols-2 lg:grid-cols-4">
          {GUARDS.map(g => (
            <div key={g.k} className="bg-olive-900 p-5">
              <p className="num text-xl font-semibold text-cream">{g.k}</p>
              <p className="mt-1 text-[0.78rem] leading-snug text-cream/55">{g.v}</p>
            </div>
          ))}
        </Reveal>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.7rem] text-cream/40">
          <span className="mono">coop · {FARM_COOP_ADDRESS}</span>
          <a
            href={VERIFIER_EXPLORER}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-cream/80"
          >
            verifier · {FARM_COOP_VERIFIER_ADDRESS.slice(0, 10)}…
            <ArrowUpRight size={10} />
          </a>
        </div>
      </div>
    </section>
  )
}

function How() {
  return (
    <section id="how" className="scroll-mt-24 bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-olive-700">
              <span className="h-1.5 w-1.5 rounded-full bg-olive-700" /> How it works
            </p>
            <h2 className="display mt-5 text-[clamp(2.2rem,4.6vw,3.6rem)] text-olive-950">
              Four steps,
              <br />
              <span className="editorial text-clay">one growing season.</span>
            </h2>
          </div>
          <p className="max-w-sm text-[0.9375rem] leading-relaxed text-olive-900/65">
            From the first deposit to the last payout, every step is a transaction you can watch —
            and every payout is one you can challenge.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-[2rem] border border-olive-700/15 bg-olive-700/15 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 90} className="h-full">
              <div className="group relative h-full bg-cream-soft/80 p-6 transition-colors duration-300 hover:bg-cream-50">
                <div className="flex items-center justify-between">
                  <span className="display text-[1.7rem] leading-none text-olive-700/35 transition-colors group-hover:text-clay">
                    {step.n}
                  </span>
                  <ArrowUpRight
                    size={16}
                    className="text-olive-700/25 transition-all group-hover:-translate-y-0.5 group-hover:text-olive-700"
                  />
                </div>
                <h3 className="mt-8 text-[1.0625rem] font-semibold text-olive-950">{step.title}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-olive-900/65">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Product() {
  return (
    <section id="app" className="scroll-mt-24 bg-cream-200/60 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <p className="eyebrow text-olive-700">
            <span className="h-1.5 w-1.5 rounded-full bg-olive-700" /> Inside the app
          </p>
          <h2 className="display mt-5 max-w-2xl text-[clamp(2.2rem,4.6vw,3.6rem)] text-olive-950">
            One cooperative.
            <br />
            <span className="editorial text-clay">Four jobs done.</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {PRODUCTS.map((product, i) => (
            <Reveal key={product.tab} delay={i * 70}>
              <a
                href={`#/app/${product.tab}`}
                className="group flex h-full flex-col rounded-3xl border border-olive-700/15 bg-cream-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-olive-700/35 hover:shadow-[0_30px_60px_-40px_rgba(35,42,23,0.9)]"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-olive-700/10 text-olive-800 transition-colors group-hover:bg-olive-700 group-hover:text-cream">
                    <product.icon size={19} strokeWidth={1.8} />
                  </span>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-olive-800/45">
                    {product.meta}
                  </span>
                </div>
                <h3 className="display mt-7 text-[1.6rem] leading-none text-olive-950">
                  {product.title}
                </h3>
                <p className="mt-2.5 max-w-sm text-[0.9375rem] leading-relaxed text-olive-900/65">
                  {product.body}
                </p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-olive-800">
                  Open {product.title.toLowerCase()}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function SignupBand() {
  const [email, setEmail] = useState('')

  const start = () => {
    const query = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''
    navigate(`/signup${query}`)
  }

  return (
    <section id="join" className="scroll-mt-24 bg-cream pb-20 md:pb-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.25rem] bg-olive-800 px-6 py-14 text-cream md:px-14 md:py-16">
            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-cream/15" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full border border-cream/15" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="eyebrow text-gold">
                  <Sparkle /> Opening the roll
                </p>
                <h2 className="display mt-4 text-[clamp(2.3rem,5vw,3.9rem)] leading-[0.95] text-cream">
                  There&rsquo;s a seat
                  <br />
                  <span className="editorial text-gold">at the table.</span>
                </h2>
                <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-cream/70">
                  Reserve your place in the cooperative. Free to join, no deposit required — you
                  only put money in the pool when you&rsquo;re ready.
                </p>
              </div>

              <div className="rounded-3xl border border-cream/15 bg-olive-900/40 p-5 backdrop-blur-sm">
                <label className="label text-cream/50" htmlFor="cta-email">
                  Email address
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="cta-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') start()
                    }}
                    placeholder="you@farm.co"
                    className="w-full rounded-full border border-cream/20 bg-cream/5 px-4 py-3 text-sm text-cream placeholder:text-cream/35 focus:border-cream/50 focus:outline-none"
                  />
                  <button onClick={start} className="btn-cream btn-sm shrink-0 py-3">
                    Reserve my place
                    <ArrowRight size={15} />
                  </button>
                </div>
                <p className="mt-3 text-[0.7rem] leading-relaxed text-cream/40">
                  Demo build — details are stored in this browser only. Nothing is emailed or sold.
                </p>
                <div className="mt-4 flex items-center gap-4 border-t border-cream/10 pt-4 text-[0.7rem] text-cream/45">
                  <span className="inline-flex items-center gap-1.5">
                    <Wallet size={12} /> Wallet connects in-app
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck size={12} /> Arc Testnet
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Sparkle() {
  return (
    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden="true">
      <path
        d="M6 0c.4 3.1 2.5 5.2 6 6-3.5.8-5.6 2.9-6 6-.4-3.1-2.5-5.2-6-6 3.5-.8 5.6-2.9 6-6Z"
        fill="currentColor"
      />
    </svg>
  )
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-olive-700/15 bg-cream py-20 md:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <Reveal>
          <p className="eyebrow text-olive-700">
            <span className="h-1.5 w-1.5 rounded-full bg-olive-700" /> Questions
          </p>
          <h2 className="display mt-5 text-[clamp(2.2rem,4vw,3rem)] text-olive-950">
            Asked before
            <br />
            <span className="editorial text-clay">joining.</span>
          </h2>
          <p className="mt-5 max-w-xs text-[0.9375rem] leading-relaxed text-olive-900/65">
            Still curious? The contract is the last word on every one of these — read it, then come
            back.
          </p>
        </Reveal>

        <div className="divide-y divide-olive-700/15 border-y border-olive-700/15">
          {FAQS.map((item, i) => (
            <Reveal key={item.q} delay={i * 50}>
              <details className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden">
                  <span className="text-[1.02rem] font-medium text-olive-950">{item.q}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-olive-700/25 text-olive-700 transition-transform duration-300 group-open:rotate-45">
                    <Plus size={14} />
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl pr-10 text-[0.9375rem] leading-relaxed text-olive-900/65">
                  {item.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="bg-olive-950 pb-28 pt-16 text-cream">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <a href="#/" className="flex items-center gap-2.5">
              <BrandMark dark className="h-9 w-9" />
              <span className="display text-[1.4rem] leading-none text-cream">FarmCoop</span>
            </a>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-cream/55">
              A member-owned farm cooperative on Arc. Pooled capital, public rules, and a payout that
              lands the same day.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a href="#/signup" className="btn-cream btn-sm">
                Join the co-op
              </a>
              <a
                href="#/app/orders"
                className="btn-sm inline-flex items-center justify-center gap-2 rounded-full border border-cream/25 px-4 py-2 text-[0.8125rem] font-semibold text-cream transition-colors hover:bg-cream/10"
              >
                Open app
              </a>
            </div>
          </div>

          <div>
            <p className="eyebrow text-cream/35">The co-op</p>
            <ul className="mt-4 space-y-2.5 text-sm text-cream/65">
              {NAV_LINKS.map(l => (
                <li key={l.id}>
                  <button
                    onClick={() => scrollToId(l.id)}
                    className="transition-colors hover:text-cream"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow text-cream/35">Onchain</p>
            <ul className="mt-4 space-y-2.5 text-sm text-cream/65">
              <li>
                <a
                  href={FARM_COOP_EXPLORER}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-cream"
                >
                  Coop contract <ArrowUpRight size={12} />
                </a>
              </li>
              <li>
                <a
                  href={VERIFIER_EXPLORER}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-cream"
                >
                  Verifier <ArrowUpRight size={12} />
                </a>
              </li>
              <li className="mono max-w-[14rem] break-all text-[0.68rem] leading-relaxed text-cream/35">
                {FARM_COOP_ADDRESS}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-cream/15 pt-6 text-[0.72rem] text-cream/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 FarmCoop · Arc Testnet · Chain ID 5042002</p>
          <p>Testnet software. Not an offer of securities, credit or financial advice.</p>
        </div>
      </div>
    </footer>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-cream">
      <SiteNav />
      <main>
        <Hero />
        <Why />
        <Rules />
        <How />
        <Product />
        <SignupBand />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  )
}
