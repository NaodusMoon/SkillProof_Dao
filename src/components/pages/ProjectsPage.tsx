'use client'

import { FormEvent, useState } from 'react'
import { PageShell } from '../PageShell'
import { LoadingState } from '../LoadingState'
import { StatusStrip } from '../StatusStrip'
import { useBootstrapData } from '../../hooks/useBootstrapData'
import type { SkillArea } from '../../lib/api'

export function ProjectsPage() {
  const { data, loading, error, createProject } = useBootstrapData()
  const [form, setForm] = useState<{
    title: string
    area: SkillArea
    summary: string
    evidenceUrl: string
    repoUrl: string
    demoUrl: string
  }>({
    title: '',
    area: 'Frontend',
    summary: '',
    evidenceUrl: '',
    repoUrl: '',
    demoUrl: '',
  })
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data || !form.title.trim() || !form.summary.trim()) return

    setSubmitting(true)
    try {
      await createProject({
        authorName: data.currentProfile.displayName,
        title: form.title.trim(),
        area: form.area,
        summary: form.summary.trim(),
        evidenceUrl: form.evidenceUrl.trim(),
        repoUrl: form.repoUrl.trim(),
        demoUrl: form.demoUrl.trim(),
      })
      setForm({
        title: '',
        area: 'Frontend',
        summary: '',
        evidenceUrl: '',
        repoUrl: '',
        demoUrl: '',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !data) return <PageShell><LoadingState message="Cargando proyectos..." /></PageShell>
  if (!data) return <PageShell><LoadingState message={error ?? 'No hay datos disponibles.'} /></PageShell>

  return (
    <PageShell>
      <section className="panel section-panel">
        <div className="section-title">
          <p className="eyebrow">Proyectos</p>
          <h2>Esta pagina existe para demostrar skill con trabajo real, no con promesas.</h2>
          <p className="section-copy">
            Cada envio crea un registro revisable por la comunidad. Si el proof
            supera el umbral de validacion, avanza a badge y suma reputacion al autor.
          </p>
        </div>
      </section>

      <StatusStrip data={data} />

      <section className="split-grid">
        <article className="panel content-panel">
          <div className="section-title">
            <p className="eyebrow">Submit proof</p>
            <h2>Enviar nuevo proyecto a revision</h2>
          </div>
          <form className="stack-form" onSubmit={onSubmit}>
            <input value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder="Titulo del proyecto" />
            <select value={form.area} onChange={(e) => setForm((c) => ({ ...c, area: e.target.value as SkillArea }))}>
              <option>Frontend</option>
              <option>Protocol</option>
              <option>Design</option>
              <option>Community</option>
              <option>Growth</option>
            </select>
            <textarea rows={5} value={form.summary} onChange={(e) => setForm((c) => ({ ...c, summary: e.target.value }))} placeholder="Que resolviste y como se comprueba." />
            <input value={form.evidenceUrl} onChange={(e) => setForm((c) => ({ ...c, evidenceUrl: e.target.value }))} placeholder="URL de evidencia" />
            <input value={form.repoUrl} onChange={(e) => setForm((c) => ({ ...c, repoUrl: e.target.value }))} placeholder="Repositorio" />
            <input value={form.demoUrl} onChange={(e) => setForm((c) => ({ ...c, demoUrl: e.target.value }))} placeholder="Demo" />
            <button className="action-button" type="submit" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar proof'}
            </button>
          </form>
        </article>

        <article className="panel content-panel">
          <div className="section-title">
            <p className="eyebrow">Despues del envio</p>
            <h2>Tu proyecto entra al pipeline de reputacion</h2>
          </div>
          <div className="content-list">
            {data.projects.map((item) => (
              <article key={item.id} className="content-card">
                <div className="card-header">
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.area}</span>
                  </div>
                  <small>{item.status}</small>
                </div>
                <p>{item.summary}</p>
                <div className="pill-row">
                  <span>builder: {item.authorName}</span>
                  <span>mentor sugerido: {item.mentorSuggestion}</span>
                  <span>positivas: {item.positiveValidations}</span>
                  <span>negativas: {item.negativeValidations}</span>
                  <span>{item.approvalRule}</span>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </PageShell>
  )
}
