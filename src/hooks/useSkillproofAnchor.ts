'use client'

import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useMemo } from 'react'
import type { RejectionCategory, SkillArea } from '../lib/api'
import { skillproofIdl } from '../lib/idl/skillproof'
import {
  deriveProjectPda,
  deriveProposalPda,
  deriveUserPda,
  deriveValidationPda,
  deriveVotePda,
} from '../lib/solanaProgram'

function mapSkillArea(area: SkillArea) {
  switch (area) {
    case 'Frontend':
      return { frontend: {} }
    case 'Protocol':
      return { backend: {} }
    case 'Design':
      return { diseno: {} }
    case 'Community':
      return { comunidad: {} }
    case 'Growth':
      return { liderazgo: {} }
    case 'Rust':
      return { rust: {} }
  }
}

function mapRejectionCategory(category?: RejectionCategory) {
  if (!category) return null
  switch (category) {
    case 'Evidencia insuficiente':
      return { evidenciaInsuficiente: {} }
    case 'Proyecto incompleto':
      return { proyectoIncompleto: {} }
    case 'No corresponde al area':
      return { noCorrespondeAlArea: {} }
  }
}

export function useSkillproofAnchor() {
  const wallet = useAnchorWallet()
  const { connection } = useConnection()

  const provider = useMemo(() => {
    if (!wallet) return null
    return new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    })
  }, [connection, wallet])

  const program = useMemo(() => {
    if (!provider) return null
    return new Program(skillproofIdl, provider)
  }, [provider])

  async function registerUser(displayName: string, bio: string) {
    if (!wallet || !program) throw new Error('Wallet no conectada')
    const [userAccount] = deriveUserPda(wallet.publicKey.toBase58())

    return program.methods
      .registerUser(displayName, bio)
      .accounts({
        authority: wallet.publicKey,
        userAccount,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  }

  async function submitProject(input: {
    title: string
    area: SkillArea
    summary: string
    evidenceUrl: string
  }) {
    if (!wallet || !program) throw new Error('Wallet no conectada')
    const [userAccount] = deriveUserPda(wallet.publicKey.toBase58())
    const [projectAccount] = deriveProjectPda(wallet.publicKey.toBase58(), input.title)

    return program.methods
      .submitProject(
        input.title,
        mapSkillArea(input.area),
        input.summary,
        input.evidenceUrl,
      )
      .accounts({
        authority: wallet.publicKey,
        userAccount,
        projectAccount,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  }

  async function validateProject(input: {
    projectPublicKey: string
    approved: boolean
    feedback: string
    rejectionCategory?: RejectionCategory
  }) {
    if (!wallet || !program) throw new Error('Wallet no conectada')
    const [validatorUser] = deriveUserPda(wallet.publicKey.toBase58())
    const projectAccount = new PublicKey(input.projectPublicKey)
    const [validationAccount] = deriveValidationPda(wallet.publicKey.toBase58(), projectAccount)

    return program.methods
      .validateProject(
        input.approved,
        mapRejectionCategory(input.rejectionCategory),
        input.feedback,
      )
      .accounts({
        validator: wallet.publicKey,
        validatorUser,
        projectAccount,
        validationAccount,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  }

  async function castVote(input: {
    proposalTitle: string
    proposalAuthorWallet: string
    support: boolean
  }) {
    if (!wallet || !program) throw new Error('Wallet no conectada')
    const [voterUser] = deriveUserPda(wallet.publicKey.toBase58())
    const [proposalAccount] = deriveProposalPda(input.proposalAuthorWallet, input.proposalTitle)
    const [voteAccount] = deriveVotePda(wallet.publicKey.toBase58(), proposalAccount)

    return program.methods
      .castVote(input.support)
      .accounts({
        voter: wallet.publicKey,
        voterUser,
        proposalAccount,
        voteAccount,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  }

  return {
    walletReady: Boolean(wallet && program),
    registerUser,
    submitProject,
    validateProject,
    castVote,
  }
}
