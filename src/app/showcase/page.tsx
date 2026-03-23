import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SkillProof DAO Showcase',
  description: 'Demo visual integrada del prototipo SkillProof DAO.',
}

export default function ShowcasePage() {
  return (
    <main style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0 }}>
      <iframe
        title="SkillProof DAO Showcase"
        src="/skillproof-dao-showcase.html"
        style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
      />
    </main>
  )
}
