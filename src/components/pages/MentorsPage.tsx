'use client'

import { PageShell } from '../PageShell'
import { LoadingState } from '../LoadingState'
import { StatusStrip } from '../StatusStrip'
import { useBootstrapData } from '../../hooks/useBootstrapData'

export function MentorsPage() {
  const { data, loading, error } = useBootstrapData()

  if (loading && !data) return <PageShell><LoadingState message="Cargando mentores..." /></PageShell>
  if (!data) return <PageShell><LoadingState message={error ?? 'No hay datos disponibles.'} /></PageShell>

  return (
    <PageShell>
      <section className="panel section-panel">
        <div className="section-title">
          <p className="eyebrow">Mentores</p>
          <h2>Cuando una prueba falla, la comunidad no expulsa: activa recuperacion.</h2>
          <p className="section-copy">
            Solo perfiles de nivel 3 pueden asumir mentorías. Cuando el proyecto
            termina aprobado, el mentor gana score y actualiza su insignia acumulativa.
          </p>
        </div>
      </section>

      <StatusStrip data={data} />

      <section className="split-grid">
        {data.mentors.map((mentor) => (
          <article key={mentor.wallet} className="panel content-panel">
            <div className="section-title">
              <p className="eyebrow">{mentor.area}</p>
              <h2>{mentor.displayName}</h2>
            </div>
            <p>{mentor.headline}</p>
            <div className="pill-row">
              <span>{mentor.sessions} mentorias</span>
              <span>{mentor.rating.toFixed(1)} rating</span>
              <span>{mentor.badge}</span>
              <span>nivel 3 requerido</span>
            </div>
          </article>
        ))}
      </section>

      <section className="panel content-panel">
        <div className="section-title">
          <p className="eyebrow">Mentorias activables</p>
          <h2>Proyectos que pueden pasar a recuperacion guiada</h2>
        </div>
        <div className="content-list">
          {data.mentorings.map((item) => (
            <article key={item.id} className="content-card">
              <div className="card-header">
                <div>
                  <strong>{item.menteeName}</strong>
                  <span>{item.area}</span>
                </div>
                <small>{item.status}</small>
              </div>
              <p>{item.notes}</p>
              <div className="pill-row">
                <span>mentor: {item.mentorName}</span>
                <span>proyecto: {item.projectId}</span>
                <span>mentorías exitosas: {item.successfulSessions}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  )
}
