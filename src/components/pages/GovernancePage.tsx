'use client'

import { PageShell } from '../PageShell'
import { LoadingState } from '../LoadingState'
import { StatusStrip } from '../StatusStrip'
import { useBootstrapData } from '../../hooks/useBootstrapData'

export function GovernancePage() {
  const { data, loading, error, voteProposal } = useBootstrapData()

  if (loading && !data) return <PageShell><LoadingState message="Cargando gobernanza..." /></PageShell>
  if (!data) return <PageShell><LoadingState message={error ?? 'No hay datos disponibles.'} /></PageShell>

  return (
    <PageShell>
      <section className="panel section-panel">
        <div className="section-title">
          <p className="eyebrow">Gobernanza</p>
          <h2>La DAO ajusta las reglas del protocolo con peso segun reputacion demostrada.</h2>
          <p className="section-copy">
            Crear propuestas requiere nivel 2. Votar requiere score minimo de 10.
            El total final es la suma ponderada de todas las participaciones.
          </p>
        </div>
      </section>

      <StatusStrip data={data} />

      <section className="content-list">
        {data.proposals.map((proposal) => (
          <article key={proposal.id} className="panel content-panel">
            <div className="card-header">
              <div>
                <strong>{proposal.title}</strong>
                <span>{proposal.category}</span>
              </div>
              <small>{proposal.status}</small>
            </div>
            <p>{proposal.summary}</p>
            <div className="pill-row">
              <span>support {proposal.supportWeight.toFixed(1)}</span>
              <span>reject {proposal.rejectWeight.toFixed(1)}</span>
              <span>peso = score actual</span>
              <span>crear requiere nivel {proposal.minLevelToCreate}</span>
              <span>votar requiere {proposal.minScoreToVote} puntos</span>
            </div>
            <p>{proposal.voteRule}</p>
            <div className="button-row">
              <button className="action-button" type="button" onClick={() => void voteProposal(proposal.id, 'support')}>
                Votar a favor
              </button>
              <button className="ghost-button minor" type="button" onClick={() => void voteProposal(proposal.id, 'reject')}>
                Votar en contra
              </button>
            </div>
          </article>
        ))}
      </section>

      <StatusStrip data={data} withNetwork />
    </PageShell>
  )
}
