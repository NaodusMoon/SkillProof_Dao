import type { Idl } from '@coral-xyz/anchor'
import { PROGRAM_ID } from '../solanaProgram'

export const skillproofIdl: Idl = {
  address: PROGRAM_ID.toBase58(),
  metadata: {
    name: 'skillproof',
    version: '0.1.0',
    spec: '0.1.0',
    description: 'SkillProof DAO reputation protocol',
  },
  instructions: [
    {
      name: 'registerUser',
      discriminator: [0, 0, 0, 0, 0, 0, 0, 1],
      accounts: [
        { name: 'authority', writable: true, signer: true },
        { name: 'userAccount', writable: true },
        { name: 'systemProgram', address: '11111111111111111111111111111111' },
      ],
      args: [
        { name: 'displayName', type: 'string' },
        { name: 'bio', type: 'string' },
      ],
    },
    {
      name: 'submitProject',
      discriminator: [0, 0, 0, 0, 0, 0, 0, 2],
      accounts: [
        { name: 'authority', writable: true, signer: true },
        { name: 'userAccount', writable: true },
        { name: 'projectAccount', writable: true },
        { name: 'systemProgram', address: '11111111111111111111111111111111' },
      ],
      args: [
        { name: 'projectName', type: 'string' },
        { name: 'area', type: { defined: { name: 'skillArea' } } },
        { name: 'description', type: 'string' },
        { name: 'evidenceUri', type: 'string' },
      ],
    },
    {
      name: 'validateProject',
      discriminator: [0, 0, 0, 0, 0, 0, 0, 3],
      accounts: [
        { name: 'validator', writable: true, signer: true },
        { name: 'validatorUser', writable: true },
        { name: 'projectAccount', writable: true },
        { name: 'validationAccount', writable: true },
        { name: 'systemProgram', address: '11111111111111111111111111111111' },
      ],
      args: [
        { name: 'approved', type: 'bool' },
        { name: 'rejectionCategory', type: { option: { defined: { name: 'rejectionCategory' } } } },
        { name: 'feedback', type: 'string' },
      ],
    },
    {
      name: 'castVote',
      discriminator: [0, 0, 0, 0, 0, 0, 0, 4],
      accounts: [
        { name: 'voter', writable: true, signer: true },
        { name: 'voterUser' },
        { name: 'proposalAccount', writable: true },
        { name: 'voteAccount', writable: true },
        { name: 'systemProgram', address: '11111111111111111111111111111111' },
      ],
      args: [{ name: 'support', type: 'bool' }],
    },
  ],
  accounts: [],
  events: [],
  errors: [],
  types: [
    {
      name: 'skillArea',
      type: {
        kind: 'enum',
        variants: [
          { name: 'Frontend' },
          { name: 'Backend' },
          { name: 'Rust' },
          { name: 'Diseno' },
          { name: 'Comunidad' },
          { name: 'Liderazgo' },
        ],
      },
    },
    {
      name: 'rejectionCategory',
      type: {
        kind: 'enum',
        variants: [
          { name: 'EvidenciaInsuficiente' },
          { name: 'ProyectoIncompleto' },
          { name: 'NoCorrespondeAlArea' },
        ],
      },
    },
  ],
} as Idl
