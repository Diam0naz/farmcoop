import { useEffect } from 'react'
import { APP_TABS, AppShell } from '@/components/AppShell'
import { LandingPage } from '@/pages/LandingPage'
import { SignupPage } from '@/pages/SignupPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { BalancePage } from '@/pages/BalancePage'
import { PoolPage } from '@/pages/PoolPage'
import { MarketplacePage } from '@/pages/MarketplacePage'
import { BusinessDashboard } from '@/pages/BusinessDashboard'
import { FunderView } from '@/pages/FunderView'
import { CoordinatorPanel } from '@/pages/CoordinatorPanel'
import { useRoute } from '@/lib/router'

function renderTab(tab: string) {
  switch (tab) {
    case 'balance':
      return <BalancePage />
    case 'pool':
      return <PoolPage />
    case 'marketplace':
      return <MarketplacePage />
    case 'business':
      return <BusinessDashboard />
    case 'funder':
      return <FunderView />
    case 'coordinator':
      return <CoordinatorPanel />
    case 'orders':
    default:
      return <OrdersPage />
  }
}

export default function App() {
  const route = useRoute()
  const [path, query = ''] = route.split('?')
  const segments = path.split('/').filter(Boolean)

  // Every route change starts at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [route])

  if (segments[0] === 'app') {
    const tab = APP_TABS.find(t => t.id === segments[1])?.id ?? 'orders'
    return <AppShell tab={tab}>{renderTab(tab)}</AppShell>
  }

  if (segments[0] === 'signup') {
    const email = new URLSearchParams(query).get('email') ?? ''
    return <SignupPage prefillEmail={email} />
  }

  return <LandingPage />
}
