'use client'

import { useConnection } from '@solana/wallet-adapter-react'
import { useClusterStats } from '../hooks/useClusterStats'
import { type BootstrapPayload } from '../lib/api'
import { formatNumber } from '../lib/format'

export function StatusStrip({
  data,
  withNetwork = false,
}: {
  data: BootstrapPayload
  withNetwork?: boolean
}) {
  const { connection } = useConnection()
  const { blockHeight, slot, tps, status } = useClusterStats(connection)

  if (withNetwork) {
    return (
      <section className="signal-strip">
        <article>
          <span>API</span>
          <strong>{data.platform.apiStatus}</strong>
        </article>
        <article>
          <span>Block height</span>
          <strong>{blockHeight ? formatNumber(blockHeight) : '...'}</strong>
        </article>
        <article>
          <span>Slot</span>
          <strong>{slot ? formatNumber(slot) : '...'}</strong>
        </article>
        <article>
          <span>TPS</span>
          <strong>{tps ? formatNumber(Math.round(tps)) : '...'}</strong>
        </article>
      </section>
    )
  }

  return (
    <section className="signal-strip five-up">
      <article>
        <span>Perfil actual</span>
        <strong>{data.currentProfile.displayName}</strong>
      </article>
      <article>
        <span>Score</span>
        <strong>{formatNumber(data.currentProfile.score)}</strong>
      </article>
      <article>
        <span>Roles</span>
        <strong>{data.currentProfile.roles.join(' / ')}</strong>
      </article>
      <article>
        <span>Peso voto</span>
        <strong>{data.currentProfile.voteWeight.toFixed(1)}x</strong>
      </article>
      <article>
        <span>Red</span>
        <strong>{status}</strong>
      </article>
    </section>
  )
}
