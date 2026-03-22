'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { api, type BootstrapPayload, type CreatePostInput, type CreateProjectInput } from '../lib/api'
import { deriveProjectPda } from '../lib/solanaProgram'
import { useSkillproofAnchor } from './useSkillproofAnchor'

export function useBootstrapData() {
  const { publicKey } = useWallet()
  const walletAddress = publicKey?.toBase58()
  const anchor = useSkillproofAnchor()
  const [data, setData] = useState<BootstrapPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chainNotice, setChainNotice] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const payload = await api.bootstrap(walletAddress)
      setData(payload)
      setError(null)
    } catch {
      setError('No se pudo conectar con el backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress])

  async function createPost(payload: Omit<CreatePostInput, 'authorWallet'>) {
    if (!data) return
    await api.createPost({
      ...payload,
      authorWallet: walletAddress ?? data.currentProfile.wallet,
    })
    await load()
  }

  async function createProject(payload: Omit<CreateProjectInput, 'authorWallet'>) {
    if (!data) return
    try {
      if (anchor.walletReady) {
        await anchor.submitProject({
          title: payload.title,
          area: payload.area,
          summary: payload.summary,
          evidenceUrl: payload.evidenceUrl,
        })
        setChainNotice('Proyecto enviado on-chain y sincronizado con el backend.')
      } else {
        setChainNotice('Proyecto guardado en backend. Conecta wallet para escribir tambien on-chain.')
      }
    } catch {
      setChainNotice('No se pudo escribir el proyecto on-chain. Se guardó solo en backend.')
    }
    await api.createProject({
      ...payload,
      authorWallet: walletAddress ?? data.currentProfile.wallet,
    })
    await load()
  }

  async function reviewProject(projectId: string, approve: boolean) {
    if (!data) return
    const project = data.projects.find((item) => item.id === projectId)
    try {
      if (anchor.walletReady && project) {
        const [projectPda] = deriveProjectPda(project.authorWallet, project.title)
        await anchor.validateProject({
          projectPublicKey: projectPda.toBase58(),
          approved: approve,
          feedback: approve
            ? 'Cumple evidencia minima y puede pasar a badge.'
            : 'Hace falta evidencia mas solida o mejor encaje con el area.',
          rejectionCategory: approve ? undefined : 'Evidencia insuficiente',
        })
        setChainNotice('Validacion enviada on-chain y sincronizada con backend.')
      } else if (!anchor.walletReady) {
        setChainNotice('Validacion guardada en backend. Conecta wallet para validacion on-chain.')
      }
    } catch {
      setChainNotice('No se pudo registrar la validacion on-chain. Se guardó solo en backend.')
    }
    await api.reviewProject(projectId, {
      reviewerWallet: walletAddress ?? data.currentProfile.wallet,
      reviewerName: data.currentProfile.displayName,
      approve,
      feedback: approve
        ? 'Cumple evidencia minima y puede pasar a badge.'
        : 'Hace falta evidencia mas solida o mejor encaje con el area.',
    })
    await load()
  }

  async function voteProposal(proposalId: string, stance: 'support' | 'reject') {
    if (!data) return
    const proposal = data.proposals.find((item) => item.id === proposalId)
    try {
      if (anchor.walletReady && proposal) {
        await anchor.castVote({
          proposalTitle: proposal.title,
          proposalAuthorWallet: proposal.authorWallet,
          support: stance === 'support',
        })
        setChainNotice('Voto enviado on-chain y sincronizado con backend.')
      } else if (!anchor.walletReady) {
        setChainNotice('Voto guardado en backend. Conecta wallet para emitirlo on-chain.')
      }
    } catch {
      setChainNotice('No se pudo emitir el voto on-chain. Se guardó solo en backend.')
    }
    await api.voteProposal(proposalId, {
      voterWallet: walletAddress ?? data.currentProfile.wallet,
      voterName: data.currentProfile.displayName,
      stance,
    })
    await load()
  }

  async function registerOnChain() {
    if (!data) return
    try {
      await anchor.registerUser(data.currentProfile.displayName, data.currentProfile.headline)
      setChainNotice('Perfil registrado on-chain.')
    } catch {
      setChainNotice('No se pudo registrar el perfil on-chain. Verifica wallet y despliegue del programa.')
    }
  }

  return {
    data,
    loading,
    error,
    walletAddress,
    reload: load,
    createPost,
    createProject,
    reviewProject,
    voteProposal,
    registerOnChain,
    chainNotice,
    walletReady: anchor.walletReady,
  }
}
