'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

const navItems = [
  { href: '/', label: 'Inicio' },
  { href: '/proyectos', label: 'Proyectos' },
  { href: '/validar', label: 'Validar' },
  { href: '/badges', label: 'Badges' },
  { href: '/mentores', label: 'Mentores' },
  { href: '/gobernanza', label: 'Gobernanza' },
  { href: '/showcase', label: 'Showcase' },
]

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span>Skill</span>
        <em>Proof</em>
        <strong>DAO</strong>
      </Link>

      <nav className="nav-links">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? 'active' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <WalletMultiButton className="wallet-button" />
    </header>
  )
}
