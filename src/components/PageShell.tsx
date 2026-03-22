'use client'

import { ReactNode } from 'react'
import { SiteHeader } from './SiteHeader'

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="shell">
      <SiteHeader />
      <div className="page-stack">{children}</div>
    </main>
  )
}
