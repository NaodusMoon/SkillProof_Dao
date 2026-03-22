'use client'

import { PageShell } from '../PageShell'
import { LoadingState } from '../LoadingState'
import { StatusStrip } from '../StatusStrip'
import { useBootstrapData } from '../../hooks/useBootstrapData'
import { badgeCatalog } from '../../lib/productContent'

export function BadgesPage() {
  const { data, loading, error } = useBootstrapData()

  if (loading && !data) return <PageShell><LoadingState message="Cargando badges..." /></PageShell>
  if (!data) return <PageShell><LoadingState message={error ?? 'No hay datos disponibles.'} /></PageShell>

  return (
    <PageShell>
      <section className="panel section-panel">
        <div className="section-title">
          <p className="eyebrow">Skill Badges</p>
          <h2>Los badges no decoran el perfil. Habilitan acciones dentro del protocolo.</h2>
          <p className="section-copy">
            Cada badge representa una skill verificada y registra un momento
            historico de reputacion. Esa credencial luego influye en validacion,
            visibilidad y gobernanza.
          </p>
        </div>
      </section>

      <StatusStrip data={data} />

      <section className="split-grid">
        {badgeCatalog.map((badge) => (
          <article key={badge.name} className="panel content-panel">
            <div className="section-title">
              <p className="eyebrow">{badge.name}</p>
              <h2>{badge.requirement}</h2>
            </div>
            <p>{badge.unlock}</p>
          </article>
        ))}
      </section>

      <section className="panel content-panel">
        <div className="section-title">
          <p className="eyebrow">Tus credenciales</p>
          <h2>Badges activos del perfil actual</h2>
        </div>
        <div className="pill-row">
          {data.currentProfile.badges.map((badge) => (
            <span key={badge.id}>{badge.name}</span>
          ))}
        </div>
        <div className="content-list" style={{ marginTop: 18 }}>
          {data.currentProfile.badges.map((badge) => (
            <article key={badge.id} className="content-card">
              <strong className="card-stat">{badge.name}</strong>
              <p>{badge.description}</p>
              <div className="pill-row">
                <span>area: {badge.area}</span>
                <span>snapshot: {badge.scoreSnapshot}</span>
                <span>{badge.soulbound ? 'soulbound' : 'transferible'}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  )
}
