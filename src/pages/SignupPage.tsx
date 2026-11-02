/**
 * Member intake — the signup entry point the marketing site sends people to.
 * Validates locally and stores the record in this browser (no backend).
 */
import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Wallet, Sprout, HandCoins } from 'lucide-react'
import { toast } from 'sonner'
import { Brand, BrandMark, CoopStamp } from '@/components/Brand'
import { isValidEmail, saveSignup, type MemberRole, type Signup } from '@/lib/signups'
import { navigate } from '@/lib/router'
import { FARM_COOP_EXPLORER } from '@/contracts'

const ROLES: { value: MemberRole; hint: string }[] = [
  { value: 'Farmer', hint: 'Grow and sell produce' },
  { value: 'Buyer', hint: 'Buy inputs with the co-op' },
  { value: 'Funder', hint: 'Pool capital, vote on deals' },
  { value: 'Business', hint: 'Raise money from members' },
]

const PERKS = [
  'A vote on every listing the co-op funds',
  'Patronage paid in USDC, straight to your balance',
  'Full sight of the ledger — deposits, votes, payouts',
]

interface FormState {
  name: string
  email: string
  role: MemberRole
  org: string
  region: string
}

export function SignupPage({ prefillEmail = '' }: { prefillEmail?: string }) {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: prefillEmail,
    role: 'Farmer',
    org: '',
    region: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [member, setMember] = useState<Signup | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Partial<Record<keyof FormState, string>> = {}
    if (form.name.trim().length < 2) next.name = 'Tell us what to call you.'
    if (!isValidEmail(form.email)) next.email = 'That email doesn’t look right.'
    if (!form.role) next.role = 'Pick the role that fits best.'
    setErrors(next)
    if (Object.keys(next).length > 0) {
      toast.error('A couple of fields need a look.')
      return
    }

    const record = saveSignup({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      org: form.org.trim(),
      region: form.region.trim(),
    })
    setMember(record)
    toast.success('You’re on the roll.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="paper min-h-dvh">
      <header className="border-b border-olive-700/15">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center gap-4 px-5">
          <Brand />
          <div className="ml-auto flex items-center gap-2">
            <a
              href="#/"
              className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-[0.8125rem] font-semibold text-olive-800 transition-colors hover:text-olive-950 sm:inline-flex"
            >
              <ArrowLeft size={14} /> Back to the co-op
            </a>
            <a href="#/app/orders" className="btn-outline btn-sm">
              Open app
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
          {/* Story panel */}
          <section className="relative flex flex-col overflow-hidden rounded-[2rem] bg-olive-800 p-7 text-cream md:p-10">
            <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full border border-cream/15" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />

            <div className="relative">
              <p className="eyebrow text-gold">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Member intake · 2026
              </p>
              <h1 className="display mt-5 text-[clamp(2.5rem,5.4vw,3.9rem)] leading-[0.94]">
                Join the
                <br />
                <span className="editorial text-gold">roll.</span>
              </h1>
              <p className="mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-cream/70">
                Membership is free and takes a minute. Put money in the pool only when you&rsquo;re
                ready — your seat is held either way.
              </p>

              <ul className="mt-8 space-y-3">
                {PERKS.map(perk => (
                  <li key={perk} className="flex items-start gap-3 text-[0.9rem] text-cream/80">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cream/10">
                      <Check size={12} className="text-gold" />
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mt-auto flex items-end justify-between gap-4 pt-10">
              <dl className="space-y-2 text-[0.72rem] uppercase tracking-[0.14em] text-cream/45">
                <div className="flex items-baseline gap-2">
                  <dt>Chain</dt>
                  <dd className="num text-sm normal-case tracking-normal text-cream/80">Arc Testnet</dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt>Asset</dt>
                  <dd className="num text-sm normal-case tracking-normal text-cream/80">USDC · 6 dec</dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt>Vote</dt>
                  <dd className="num text-sm normal-case tracking-normal text-cream/80">1 share, capped 15%</dd>
                </div>
              </dl>
              <CoopStamp className="hidden h-24 w-24 shrink-0 text-cream/70 sm:block" />
            </div>
          </section>

          {/* Form / confirmation */}
          <section className="rounded-[2rem] border border-olive-700/15 bg-cream-50 p-7 shadow-[0_30px_70px_-50px_rgba(35,42,23,0.8)] md:p-10">
            {member ? (
              <div className="animate-fade-in">
                <BrandMark className="h-12 w-12" />
                <p className="eyebrow mt-6 text-clay">You&rsquo;re on the roll</p>
                <h2 className="display mt-3 text-[clamp(2rem,4vw,2.9rem)] leading-[0.96] text-olive-950">
                  Welcome,
                  <br />
                  {member.name.split(' ')[0]}.
                </h2>
                <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-olive-900/70">
                  Your member number is{' '}
                  <span className="mono rounded-md bg-olive-700/10 px-1.5 py-0.5 text-[0.8rem] text-olive-900">
                    {member.id}
                  </span>
                  . The coordinator adds numbers to the onchain roll from the app — connect your
                  wallet to see your standing.
                </p>

                <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-olive-700/15 bg-olive-700/15 sm:grid-cols-2">
                  <div className="bg-cream-50 p-4">
                    <p className="label mb-1">Role</p>
                    <p className="text-sm font-semibold text-olive-950">{member.role}</p>
                  </div>
                  <div className="bg-cream-50 p-4">
                    <p className="label mb-1">Email</p>
                    <p className="truncate text-sm font-semibold text-olive-950">{member.email}</p>
                  </div>
                </div>

                <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                  <button onClick={() => navigate('/app/orders')} className="btn-olive flex-1">
                    Enter the app <ArrowRight size={16} />
                  </button>
                  <a href="#/" className="btn-outline flex-1">
                    Back to site
                  </a>
                </div>
                <p className="mt-4 text-[0.7rem] leading-relaxed text-olive-900/45">
                  Demo build: this record lives in this browser only. Nothing was emailed or sold.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <p className="eyebrow text-olive-700">
                  <Sprout size={13} /> Create your member profile
                </p>
                <h2 className="display mt-3 text-[clamp(1.8rem,3.6vw,2.5rem)] leading-none text-olive-950">
                  A minute, honestly.
                </h2>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-olive-900/65">
                  We only ask what the coordinator needs to find you in the ledger.
                </p>

                <div className="mt-7 space-y-4">
                  <div>
                    <label className="label" htmlFor="signup-name">
                      Full name
                    </label>
                    <input
                      id="signup-name"
                      className="field"
                      placeholder="Amara Okafor"
                      value={form.name}
                      aria-invalid={!!errors.name}
                      onChange={e => set('name', e.target.value)}
                    />
                    {errors.name && <p className="mt-1.5 text-xs text-[var(--danger)]">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="label" htmlFor="signup-email">
                      Email
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      className="field"
                      placeholder="you@farm.co"
                      value={form.email}
                      aria-invalid={!!errors.email}
                      onChange={e => set('email', e.target.value)}
                    />
                    {errors.email && <p className="mt-1.5 text-xs text-[var(--danger)]">{errors.email}</p>}
                  </div>

                  <div>
                    <span className="label">I&rsquo;m joining as</span>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLES.map(role => {
                        const active = form.role === role.value
                        return (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => set('role', role.value)}
                            aria-pressed={active}
                            className={`rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ${
                              active
                                ? 'border-olive-700 bg-olive-700 text-cream shadow-[0_10px_24px_-20px_rgba(35,42,23,0.9)]'
                                : 'border-olive-700/15 bg-cream-50 text-olive-900 hover:border-olive-700/35'
                            }`}
                          >
                            <span className="block text-[0.84rem] font-semibold">{role.value}</span>
                            <span
                              className={`mt-0.5 block text-[0.68rem] leading-snug ${
                                active ? 'text-cream/60' : 'text-olive-900/50'
                              }`}
                            >
                              {role.hint}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="signup-org">
                        Farm / business <span className="normal-case tracking-normal text-olive-900/35">(optional)</span>
                      </label>
                      <input
                        id="signup-org"
                        className="field"
                        placeholder="Okafor Family Farm"
                        value={form.org}
                        onChange={e => set('org', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="signup-region">
                        District / region
                      </label>
                      <input
                        id="signup-region"
                        className="field"
                        placeholder="Enugu North"
                        value={form.region}
                        onChange={e => set('region', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn-olive btn-block mt-6">
                  Join the cooperative
                  <ArrowRight size={16} />
                </button>

                <div className="mt-4 flex items-start gap-2 text-[0.7rem] leading-relaxed text-olive-900/45">
                  <ShieldCheck size={13} className="mt-0.5 shrink-0" />
                  <p>
                    Demo build — your details stay in this browser. You can join the onchain roll
                    once the coordinator adds your wallet.
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-olive-700/15 pt-4 text-[0.75rem] text-olive-900/55">
                  <span className="inline-flex items-center gap-1.5">
                    <Wallet size={12} /> Wallet connects in-app
                  </span>
                  <a
                    href={FARM_COOP_EXPLORER}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-olive-800 hover:text-olive-950"
                  >
                    <HandCoins size={12} /> Read the contract
                  </a>
                </div>
              </form>
            )}
          </section>
        </div>

        {/* What happens next */}
        <section className="mt-12">
          <p className="eyebrow text-olive-700">
            <span className="h-1.5 w-1.5 rounded-full bg-olive-700" /> What happens next
          </p>
          <div className="mt-5 grid gap-px overflow-hidden rounded-3xl border border-olive-700/15 bg-olive-700/15 md:grid-cols-3">
            {[
              {
                n: '01',
                t: 'Coordinator sees your request',
                b: 'Your member record is issued a number and queued for the roll.',
              },
              {
                n: '02',
                t: 'Connect your wallet',
                b: 'Open the app, connect, and the coordinator adds your address onchain.',
              },
              {
                n: '03',
                t: 'Deposit when ready',
                b: 'Mint shares at NAV and start voting on what the co-op funds.',
              },
            ].map(step => (
              <div key={step.n} className="bg-cream-50 p-6">
                <span className="display text-[1.5rem] leading-none text-clay/80">{step.n}</span>
                <h3 className="mt-4 text-[0.95rem] font-semibold text-olive-950">{step.t}</h3>
                <p className="mt-1.5 text-[0.86rem] leading-relaxed text-olive-900/60">{step.b}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-24 pt-4 text-[0.7rem] text-olive-900/40">
        © 2026 FarmCoop · Arc Testnet · Testnet software, not financial advice.
      </footer>
    </div>
  )
}
