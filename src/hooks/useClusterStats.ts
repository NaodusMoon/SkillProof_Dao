import { useEffect, useState } from 'react'
import type { Connection } from '@solana/web3.js'

type ClusterStats = {
  blockHeight: number | null
  slot: number | null
  tps: number | null
  status: 'online' | 'loading' | 'offline'
}

export function useClusterStats(connection: Connection): ClusterStats {
  const [stats, setStats] = useState<ClusterStats>({
    blockHeight: null,
    slot: null,
    tps: null,
    status: 'loading',
  })

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      try {
        const [blockHeight, slot, perf] = await Promise.all([
          connection.getBlockHeight(),
          connection.getSlot(),
          connection.getRecentPerformanceSamples(1),
        ])

        if (cancelled) {
          return
        }

        const sample = perf[0]
        const tps = sample ? sample.numTransactions / sample.samplePeriodSecs : null

        setStats({
          blockHeight,
          slot,
          tps,
          status: 'online',
        })
      } catch {
        if (!cancelled) {
          setStats((current) => ({
            ...current,
            status: 'offline',
          }))
        }
      }
    }

    loadStats()
    const intervalId = window.setInterval(loadStats, 30000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [connection])

  return stats
}
