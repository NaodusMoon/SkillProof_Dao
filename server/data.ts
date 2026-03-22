import type {
  Badge,
  BootstrapPayload,
  CreateProjectInput,
  DaoPolicy,
  Mentoring,
  Mentor,
  Post,
  Profile,
  Project,
  Proposal,
  Role,
  SkillArea,
  Validation,
} from '../src/lib/api.js'

const daoPolicy: DaoPolicy = {
  levels: [
    { level: 0, scoreRange: '0-9', label: 'Observador', permissions: ['Ver perfiles y proyectos'] },
    { level: 1, scoreRange: '10-49', label: 'Votante', permissions: ['Votar propuestas'] },
    { level: 2, scoreRange: '50-99', label: 'Validador', permissions: ['Validar proyectos', 'Crear propuestas', 'Votar'] },
    { level: 3, scoreRange: '100+', label: 'Mentor', permissions: ['Ser mentor sugerido', 'Validar', 'Crear propuestas', 'Votar'] },
  ],
  projectApprovalRule: '3 validaciones positivas o 2 positivas + 48 horas',
  validationReward: '+2 al score del validador',
  projectReward: '+1 al score del autor',
  mentoringReward: '+5 al score del mentor',
}

const camilaWallet = 'DDStEY6cFPaB7LFjeKjr3Ami8Xt8FA8sGd9Qaxmbq5YG'
const mateoWallet = 'DrP7ydXsaSKJqLqd1eDUKZ3LZhfZS6MhjQSXX9yeZEab'
const danielWallet = 'J17EhPGKV2A1u2q3xqrnbPHM4gKNHX9bGN9LxnpPoYHK'
const saraWallet = 'GBbSXVvd8ChTJBz6f9npUsiwuH9NsDpjhKuc16DxUyee'

function permissionsFromLevel(level: 0 | 1 | 2 | 3) {
  return {
    canView: true,
    canVote: level >= 1,
    canValidate: level >= 2,
    canMentor: level >= 3,
    canCreateProposal: level >= 2,
  }
}

const profiles: Profile[] = [
  {
    wallet: camilaWallet,
    displayName: 'Camila Rios',
    headline: 'Builder de producto on-chain, validadora y mentora de squads.',
    primaryRole: 'builder',
    roles: ['builder', 'validator', 'mentor'],
    level: 3,
    score: 742,
    scoreBreakdown: { builder: 412, validator: 210, mentor: 120 },
    mentorSessions: 18,
    successfulProjects: 9,
    validationsCount: 26,
    successfulMentorships: 5,
    voteWeight: 2.4,
    permissions: permissionsFromLevel(3),
    badges: [],
  },
  {
    wallet: mateoWallet,
    displayName: 'Mateo Forge',
    headline: 'Mentor de arquitectura Solana, PDAs y flujos reputacionales.',
    primaryRole: 'mentor',
    roles: ['mentor', 'validator'],
    level: 3,
    score: 694,
    scoreBreakdown: { builder: 110, validator: 184, mentor: 400 },
    mentorSessions: 31,
    successfulProjects: 2,
    validationsCount: 19,
    successfulMentorships: 12,
    voteWeight: 2.1,
    permissions: permissionsFromLevel(3),
    badges: [],
  },
]

const validations: Validation[] = [
  {
    id: 'validation-1',
    projectId: 'project-1',
    validatorWallet: profiles[1].wallet,
    validatorName: profiles[1].displayName,
    approved: true,
    feedback: 'La evidencia conecta bien el problema con el resultado y la arquitectura es consistente.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 'validation-2',
    projectId: 'project-1',
    validatorWallet: profiles[0].wallet,
    validatorName: profiles[0].displayName,
    approved: true,
    feedback: 'El caso de uso para hackathons está bien justificado y el filtro por skills es claro.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'validation-3',
    projectId: 'project-2',
    validatorWallet: profiles[1].wallet,
    validatorName: profiles[1].displayName,
    approved: false,
    rejectionCategory: 'Evidencia insuficiente',
    feedback: 'La UI está bien planteada pero falta demostrar uso y criterio de ponderación real.',
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
]

const badges: Badge[] = [
  {
    id: 'badge-1',
    name: 'Rust Developer',
    area: 'Rust',
    description: 'Acredita ejecución técnica consistente en Rust y lógica de protocolo.',
    requirement: 'Aprobar proyectos de lógica on-chain o tooling en Rust.',
    unlock: 'Te posiciona como validador técnico y mejora tu peso en propuestas de arquitectura.',
    holderWallet: profiles[0].wallet,
    projectId: 'project-legacy-1',
    scoreSnapshot: 510,
    soulbound: true,
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
  },
  {
    id: 'badge-2',
    name: 'Mentor Activo',
    area: 'Community',
    description: 'Reconoce mentorías que terminan en aprobación verificable.',
    requirement: 'Completar mentorías exitosas.',
    unlock: 'Te vuelve mentor sugerido por el protocolo y base para futuras donaciones.',
    holderWallet: profiles[0].wallet,
    projectId: 'project-legacy-2',
    scoreSnapshot: 670,
    soulbound: true,
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
]

profiles[0].badges = badges.filter((badge) => badge.holderWallet === profiles[0].wallet)
profiles[1].badges = badges.filter((badge) => badge.holderWallet === profiles[1].wallet)

const projects: Project[] = [
  {
    id: 'project-1',
    authorWallet: profiles[0].wallet,
    authorName: profiles[0].displayName,
    title: 'Hackathon Match Engine',
    area: 'Protocol',
    summary: 'Motor que filtra equipos por score, badges y feedback histórico.',
    evidenceUrl: 'https://example.com/evidence/match',
    repoUrl: 'https://github.com/example/match',
    demoUrl: 'https://demo.example.com/match',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    positiveValidations: 2,
    negativeValidations: 0,
    approvalRule: daoPolicy.projectApprovalRule,
    mentorSuggestion: 'Mateo Forge',
    validations: validations.filter((item) => item.projectId === 'project-1'),
  },
  {
    id: 'project-2',
    authorWallet: danielWallet,
    authorName: 'Daniel Vega',
    title: 'Weighted Governance UI',
    area: 'Frontend',
    summary: 'Interfaz de voto con peso reputacional por especialidad verificada.',
    evidenceUrl: 'https://example.com/evidence/gov',
    repoUrl: 'https://github.com/example/gov',
    demoUrl: 'https://demo.example.com/gov',
    status: 'rejected',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    positiveValidations: 0,
    negativeValidations: 1,
    approvalRule: daoPolicy.projectApprovalRule,
    mentorSuggestion: 'Sara Bloom',
    validations: validations.filter((item) => item.projectId === 'project-2'),
  },
]

const mentorings: Mentoring[] = [
  {
    id: 'mentoring-1',
    projectId: 'project-2',
    menteeWallet: danielWallet,
    menteeName: 'Daniel Vega',
    mentorWallet: profiles[1].wallet,
    mentorName: profiles[1].displayName,
    area: 'Frontend',
    status: 'available',
    successfulSessions: 12,
    notes: 'Ideal para reforzar evidencia, criterio de ponderación y conexión con la gobernanza.',
  },
]

const mentors: Mentor[] = [
  {
    wallet: profiles[1].wallet,
    displayName: profiles[1].displayName,
    headline: profiles[1].headline,
    area: 'Protocol',
    sessions: 31,
    rating: 4.9,
    badge: 'Mentor Activo',
    levelRequired: 3,
  },
  {
    wallet: saraWallet,
    displayName: 'Sara Bloom',
    headline: 'Mentora de frontend, UX y documentación evaluable.',
    area: 'Frontend',
    sessions: 14,
    rating: 4.7,
    badge: 'Validator Expert',
    levelRequired: 3,
  },
]

const proposals: Proposal[] = [
  {
    id: 'proposal-team-matching',
    authorWallet: profiles[0].wallet,
    authorName: profiles[0].displayName,
    title: 'Activar matching automático para hackathons',
    summary: 'Sugerir equipos a partir de badges, score y afinidad de skills.',
    category: 'Product',
    status: 'active',
    minLevelToCreate: 2,
    minScoreToVote: 10,
    voteRule: 'El peso del voto es el score actual del votante.',
    supportWeight: 18.2,
    rejectWeight: 3.4,
  },
  {
    id: 'proposal-mentor-donations',
    authorWallet: profiles[1].wallet,
    authorName: profiles[1].displayName,
    title: 'Habilitar donaciones voluntarias a mentores',
    summary: 'Desbloquear donaciones cuando una mentoría termine en badge emitido.',
    category: 'Governance',
    status: 'active',
    minLevelToCreate: 2,
    minScoreToVote: 10,
    voteRule: 'El peso del voto es el score actual del votante.',
    supportWeight: 12.9,
    rejectWeight: 2.1,
  },
]

const posts: Post[] = [
  {
    id: 'post-1',
    authorWallet: profiles[0].wallet,
    authorName: profiles[0].displayName,
    role: 'builder',
    content: 'Subí una demo de weighted governance y necesito revisión del score aplicado por badge.',
    tags: ['governance', 'solana', 'review'],
    createdAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
  },
  {
    id: 'post-2',
    authorWallet: profiles[1].wallet,
    authorName: profiles[1].displayName,
    role: 'mentor',
    content: 'Abrí mentorías para builders que quieran pasar de MVP a evidencia apta para badge.',
    tags: ['mentor', 'builders'],
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
]

function guestProfile(wallet?: string): Profile {
  if (!wallet) {
    return profiles[0]
  }

  return {
    wallet,
    displayName: 'Guest Builder',
    headline: 'Wallet conectada. Aún sin historial verificado.',
    primaryRole: 'builder',
    roles: ['builder'],
    level: 1,
    score: 120,
    scoreBreakdown: { builder: 120, validator: 0, mentor: 0 },
    mentorSessions: 0,
    successfulProjects: 0,
    validationsCount: 0,
    successfulMentorships: 0,
    voteWeight: 1,
    permissions: permissionsFromLevel(1),
    badges: [],
  }
}

export function getBootstrap(wallet?: string): BootstrapPayload {
  return {
    platform: {
      apiStatus: 'online',
      runtime: 'Next.js + Express + Anchor',
      network: 'Solana Devnet',
    },
    currentProfile: wallet ? guestProfile(wallet) : profiles[0],
    posts: [...posts].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    projects: [...projects].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    reviewQueue: projects.filter((project) => project.status === 'pending' || project.status === 'rejected'),
    badges,
    mentors,
    mentorings,
    proposals,
    daoPolicy,
  }
}

export function createPost(input: {
  authorWallet: string
  authorName: string
  role: Role
  content: string
  tags: string[]
}) {
  const post: Post = {
    id: `post-${posts.length + 1}`,
    authorWallet: input.authorWallet,
    authorName: input.authorName,
    role: input.role,
    content: input.content,
    tags: input.tags,
    createdAt: new Date().toISOString(),
  }

  posts.unshift(post)
  return post
}

export function createProject(input: CreateProjectInput) {
  const project: Project = {
    id: `project-${projects.length + 1}`,
    authorWallet: input.authorWallet,
    authorName: input.authorName,
    title: input.title,
    area: input.area,
    summary: input.summary,
    evidenceUrl: input.evidenceUrl,
    repoUrl: input.repoUrl,
    demoUrl: input.demoUrl,
    status: 'pending',
    createdAt: new Date().toISOString(),
    positiveValidations: 0,
    negativeValidations: 0,
    approvalRule: daoPolicy.projectApprovalRule,
    mentorSuggestion: input.area === 'Protocol' ? 'Mateo Forge' : 'Sara Bloom',
    validations: [],
  }

  projects.unshift(project)
  return project
}

export function reviewProject(
  projectId: string,
  input: {
    reviewerWallet: string
    reviewerName: string
    approve: boolean
    feedback: string
  },
) {
  const project = projects.find((item) => item.id === projectId)
  if (!project) throw new Error('Project not found')

  const validation: Validation = {
    id: `validation-${validations.length + 1}`,
    projectId: project.id,
    validatorWallet: input.reviewerWallet,
    validatorName: input.reviewerName,
    approved: input.approve,
    rejectionCategory: input.approve ? undefined : 'Evidencia insuficiente',
    feedback: input.feedback,
    createdAt: new Date().toISOString(),
  }

  validations.unshift(validation)
  project.validations.unshift(validation)

  if (input.approve) {
    project.positiveValidations += 1
    project.status = project.positiveValidations >= 3 ? 'approved' : 'pending'
  } else {
    project.negativeValidations += 1
    project.status = 'retry'
  }

  posts.unshift({
    id: `post-${posts.length + 1}`,
    authorWallet: input.reviewerWallet,
    authorName: input.reviewerName,
    role: 'validator',
    content: input.approve
      ? `Aprobé ${project.title}. La entrega ya está más cerca de convertirse en badge.`
      : `Marqué ${project.title} para reintento con feedback y ruta de mejora.`,
    tags: ['review', project.area.toLowerCase()],
    createdAt: new Date().toISOString(),
  })

  return project
}

export function voteProposal(
  proposalId: string,
  input: {
    voterWallet: string
    voterName: string
    stance: 'support' | 'reject'
  },
) {
  const proposal = proposals.find((item) => item.id === proposalId)
  if (!proposal) throw new Error('Proposal not found')

  const profile = profiles.find((item) => item.wallet === input.voterWallet) ?? guestProfile(input.voterWallet)
  const weight = profile.voteWeight

  if (input.stance === 'support') {
    proposal.supportWeight += weight
  } else {
    proposal.rejectWeight += weight
  }

  posts.unshift({
    id: `post-${posts.length + 1}`,
    authorWallet: input.voterWallet,
    authorName: input.voterName,
    role: profile.primaryRole,
    content: `${input.voterName} votó ${input.stance === 'support' ? 'a favor' : 'en contra'} de ${proposal.title} con peso ${weight.toFixed(1)}x.`,
    tags: ['governance', 'vote'],
    createdAt: new Date().toISOString(),
  })

  return proposal
}
