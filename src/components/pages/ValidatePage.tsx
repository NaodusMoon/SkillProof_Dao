'use client'

import { PageShell } from '../PageShell'
import { LoadingState } from '../LoadingState'
import { StatusStrip } from '../StatusStrip'
import { useBootstrapData } from '../../hooks/useBootstrapData'

export function ValidatePage() {
  const { data, loading, error, reviewProject } = useBootstrapData()

  if (loading && !data) return <PageShell><LoadingState message="Cargando cola de validacion..." /></PageShell>
  if (!data) return <PageShell><LoadingState message={error ?? 'No hay datos disponibles.'} /></PageShell>

  return (
    <PageShell>
      <section className="panel section-panel">
        <div className="section-title">
          <p className="eyebrow">Validar</p>
          <h2>Esta pagina convierte criterio confiable en reputacion para otros y para ti.</h2>
          <p className="section-copy">
            La validacion positiva suma puntos al validador. La negativa obliga a
            categorizar el rechazo y deja el proyecto marcado para reintento o mentor.
          </p>
        </div>
      </section>

      <StatusStrip data={data} />

      <section className="content-list">
        {data.reviewQueue.map((item) => (
          <article key={item.id} className="panel content-panel">
            <div className="card-header">
              <div>
                <strong>{item.title}</strong>
                <span>{item.area}</span>
              </div>
              <small>{item.status}</small>
            </div>
            <p>{item.summary}</p>
            <div className="pill-row">
              <span>Builder: {item.authorName}</span>
              <span>Mentor sugerido: {item.mentorSuggestion}</span>
              <span>positivas: {item.positiveValidations}</span>
              <span>negativas: {item.negativeValidations}</span>
              <span>Regla: score minimo 50</span>
            </div>
            {item.validations.length > 0 && (
              <div className="content-list" style={{ marginTop: 16 }}>
                {item.validations.map((validation) => (
                  <article key={validation.id} className="content-card">
                    <div className="card-header">
                      <div>
                        <strong>{validation.validatorName}</strong>
                        <span>{validation.approved ? 'aprobado' : validation.rejectionCategory}</span>
                      </div>
                      <small>{validation.createdAt.slice(0, 10)}</small>
                    </div>
                    <p>{validation.feedback}</p>
                  </article>
                ))}
              </div>
            )}
            <div className="button-row">
              <button className="action-button" type="button" onClick={() => void reviewProject(item.id, true)}>
                Aprobar
              </button>
              <button className="ghost-button minor" type="button" onClick={() => void reviewProject(item.id, false)}>
                Rechazar / Reintento
              </button>
            </div>
          </article>
        ))}
      </section>
    </PageShell>
  )
}
