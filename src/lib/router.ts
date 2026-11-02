/**
 * Tiny hash router — keeps deep links (#/app/pool) shareable without pulling in
 * a routing dependency. `useSyncExternalStore` avoids state updates in effects.
 */
import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  window.addEventListener('popstate', onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
    window.removeEventListener('popstate', onChange)
  }
}

function getSnapshot() {
  return window.location.hash.replace(/^#/, '') || '/'
}

function getServerSnapshot() {
  return '/'
}

export function useRoute(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function navigate(path: string) {
  if (getSnapshot() === path) {
    window.scrollTo({ top: 0, behavior: 'auto' })
    return
  }
  window.location.hash = path
  window.scrollTo({ top: 0, behavior: 'auto' })
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
