'use client'

import Link from 'next/link'
import { PageShell } from '../PageShell'
import { LoadingState } from '../LoadingState'
import { StatusStrip } from '../StatusStrip'
import { useBootstrapData } from '../../hooks/useBootstrapData'
import { PROGRAM_ID, deriveProposalPda, deriveUserPda } from '../../lib/solanaProgram'
import { daoUseCases, trustFlow } from '../../lib/productContent'

export function HomePage() {
  const { data, loading, error, walletAddress, registerOnChain, chainNotice, walletReady } = useBootstrapData()

  if (loading && !data) return <PageShell><LoadingState message="Cargando SkillProof DAO..." /></PageShell>
  if (!data) return <PageShell><LoadingState message={error ?? 'No hay datos disponibles.'} /></PageShell>

  const userPda = walletAddress ? deriveUserPda(walletAddress)[0].toBase58() : 'Conecta wallet'
  const proposalPda = data.proposals[0]
    ? deriveProposalPda(data.proposals[0].authorWallet, data.proposals[0].title)[0].toBase58()
    : 'Sin propuesta activa'

  return (
    <PageShell>
      <section className="hero panel">
        <div className="hero-copy">
          <p className="eyebrow">◆ Construido en Solana</p>
          <h1>
            Tu reputacion
            <br />
            son tus
            <br />
            <span>acciones</span>
          </h1>
          <p className="lede">
            Una comunidad donde cualquier persona demuestra lo que vale haciendo
            cosas reales. La evidencia vive en el producto y la credencial vive
            on-chain.
          </p>
          <div className="hero-actions">
            <Link className="action-button" href="/proyectos">
              Demostrar skill
            </Link>
            <Link className="ghost-button" href="/badges">
              Explorar badges
            </Link>
            <button className="ghost-button" type="button" onClick={() => void registerOnChain()}>
              {walletReady ? 'Registrar on-chain' : 'Conecta wallet para registrar'}
            </button>
          </div>
          {chainNotice && <p className="section-copy">{chainNotice}</p>}
        </div>

        <div className="badge-showcase">
          <div className="showcase-card">
            <p className="showcase-title">Skill Badges ganados</p>
            <div className="showcase-list">
              <article>
                <span className="badge-icon">🦀</span>
                <div>
                  <strong>Rust Developer</strong>
                  <small>3 proyectos aprobados</small>
                </div>
                <em>+6 pts</em>
              </article>
              <article>
                <span className="badge-icon">🌱</span>
                <div>
                  <strong>Mentor activo</strong>
                  <small>5 mentorias exitosas</small>
                </div>
                <em>+25 pts</em>
              </article>
              <article>
                <span className="badge-icon">⚡</span>
                <div>
                  <strong>Validador experto</strong>
                  <small>12 validaciones</small>
                </div>
                <em>+24 pts</em>
              </article>
            </div>
          </div>
        </div>
      </section>

      <StatusStrip data={data} />

      <section className="panel section-panel">
        <div className="section-title">
          <p className="eyebrow">La capa de confianza</p>
          <h2>SkillProof DAO convierte trabajo, criterio y participacion en reputacion utilizable.</h2>
        </div>
        <div className="metrics-grid">
          {trustFlow.map((item) => (
            <article key={item.step} className="metric-card">
              <span>{item.step}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="split-grid">
        <article className="panel section-panel">
          <div className="section-title">
            <p className="eyebrow">Contrato Anchor</p>
            <h2>Arquitectura de reputacion separada en PDAs y reglas de negocio claras.</h2>
          </div>
          <div className="contract-grid">
            <div>
              <span>Program ID</span>
              <strong>{PROGRAM_ID.toBase58()}</strong>
            </div>
            <div>
              <span>User PDA</span>
              <strong>{userPda}</strong>
            </div>
            <div>
              <span>Proposal PDA</span>
              <strong>{proposalPda}</strong>
            </div>
          </div>
        </article>

        <article className="panel section-panel">
          <div className="section-title">
            <p className="eyebrow">Que resuelve la DAO</p>
            <h2>La reputacion no solo informa. Tambien coordina comunidad.</h2>
          </div>
          <div className="content-list">
            {daoUseCases.map((item) => (
              <article key={item.title} className="content-card">
                <strong className="card-stat">{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="metrics-grid">
        <article className="panel section-panel">
          <span className="section-kicker">Perfil</span>
          <h2>{data.currentProfile.displayName}</h2>
          <p>{data.currentProfile.headline}</p>
          <div className="pill-row">
            {data.currentProfile.roles.map((role) => (
              <span key={role}>{role}</span>
            ))}
          </div>
          <div className="pill-row">
            <span>nivel {data.currentProfile.level}</span>
            <span>builder {data.currentProfile.scoreBreakdown.builder}</span>
            <span>validator {data.currentProfile.scoreBreakdown.validator}</span>
            <span>mentor {data.currentProfile.scoreBreakdown.mentor}</span>
          </div>
        </article>
        <article className="panel section-panel">
          <span className="section-kicker">Rutas</span>
          <h2>Cada pagina existe para una funcion del protocolo.</h2>
          <div className="pill-row">
            <Link href="/proyectos"><span>Proyectos</span></Link>
            <Link href="/validar"><span>Validar</span></Link>
            <Link href="/badges"><span>Badges</span></Link>
            <Link href="/mentores"><span>Mentores</span></Link>
            <Link href="/gobernanza"><span>Gobernanza</span></Link>
          </div>
        </article>
      </section>

      <section className="metrics-grid">
        <article className="panel section-panel">
          <span className="section-kicker">Permisos</span>
          <h2>Lo que tu reputacion ya desbloquea</h2>
          <div className="pill-row">
            {data.currentProfile.permissions.canVote && <span>puede votar</span>}
            {data.currentProfile.permissions.canValidate && <span>puede validar</span>}
            {data.currentProfile.permissions.canCreateProposal && <span>puede crear propuestas</span>}
            {data.currentProfile.permissions.canMentor && <span>puede ser mentor</span>}
          </div>
        </article>
        <article className="panel section-panel">
          <span className="section-kicker">Politica DAO</span>
          <h2>Reglas visibles del protocolo</h2>
          <div className="pill-row">
            <span>{data.daoPolicy.projectApprovalRule}</span>
            <span>{data.daoPolicy.validationReward}</span>
            <span>{data.daoPolicy.projectReward}</span>
            <span>{data.daoPolicy.mentoringReward}</span>
          </div>
        </article>
      </section>

      <StatusStrip data={data} withNetwork />
    </PageShell>
  )
}
