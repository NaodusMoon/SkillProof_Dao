import { PublicKey } from '@solana/web3.js'

export const PROGRAM_ID = new PublicKey('3zhshhVRmnVyTio5rXHindxv9MGBR3aFtFgWLH7wNi6C')
const textEncoder = new TextEncoder()
const MAX_SEED_BYTES = 32

function parsePublicKey(value: string) {
  try {
    return new PublicKey(value)
  } catch {
    return PROGRAM_ID
  }
}

function textSeed(value: string) {
  return Buffer.from(textEncoder.encode(value)).subarray(0, MAX_SEED_BYTES)
}

export function deriveUserPda(walletAddress: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user'), parsePublicKey(walletAddress).toBuffer()],
    PROGRAM_ID,
  )
}

export function deriveProjectPda(walletAddress: string, projectTitle: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('project'), parsePublicKey(walletAddress).toBuffer(), textSeed(projectTitle)],
    PROGRAM_ID,
  )
}

export function deriveValidationPda(walletAddress: string, projectPublicKey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('validation'), parsePublicKey(walletAddress).toBuffer(), projectPublicKey.toBuffer()],
    PROGRAM_ID,
  )
}

export function deriveProposalPda(authorWallet: string, proposalTitle: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('proposal'), parsePublicKey(authorWallet).toBuffer(), textSeed(proposalTitle)],
    PROGRAM_ID,
  )
}

export function deriveVotePda(walletAddress: string, proposalPublicKey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vote'), parsePublicKey(walletAddress).toBuffer(), proposalPublicKey.toBuffer()],
    PROGRAM_ID,
  )
}
