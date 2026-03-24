export type Role = 'builder' | 'validator' | 'mentor'
export type SolanaCluster = 'devnet' | 'testnet'
export type ProjectStatus = 'pending' | 'approved' | 'rejected'
export type SkillArea =
  | 'Frontend'
  | 'Protocol'
  | 'Design'
  | 'Community'
  | 'Growth'
  | 'Rust'

export type RejectionCategory =
  | 'Evidencia insuficiente'
  | 'Proyecto incompleto'
  | 'No corresponde al area'

export type Badge = {
  id: string
  name: string
  area: SkillArea
  description: string
  requirement: string
  unlock: string
  holderWallet: string
  projectId: string
  scoreSnapshot: number
  soulbound: boolean
  issuedAt: string
}

export type ScoreBreakdown = {
  builder: number
  validator: number
  mentor: number
}

export type PermissionSet = {
  canView: boolean
  canVote: boolean
  canValidate: boolean
  canMentor: boolean
  canCreateProposal: boolean
}

export type Profile = {
  wallet: string
  displayName: string
  headline: string
  primaryRole: Role
  roles: Role[]
  level: 0 | 1 | 2 | 3
  score: number
  scoreBreakdown: ScoreBreakdown
  mentorSessions: number
  successfulProjects: number
  validationsCount: number
  successfulMentorships: number
  voteWeight: number
  permissions: PermissionSet
  badges: Badge[]
}

export type Validation = {
  id: string
  projectId: string
  validatorWallet: string
  validatorName: string
  approved: boolean
  rejectionCategory?: RejectionCategory
  feedback: string
  createdAt: string
}

export type Project = {
  id: string
  authorWallet: string
  authorName: string
  title: string
  area: SkillArea
  summary: string
  evidenceUrl: string
  repoUrl: string
  demoUrl: string
  status: ProjectStatus
  createdAt: string
  positiveValidations: number
  negativeValidations: number
  approvalRule: string
  mentorSuggestion?: string
  validations: Validation[]
  mintedBadgeId?: string
}

export type Mentoring = {
  id: string
  projectId: string
  menteeWallet: string
  menteeName: string
  mentorWallet: string
  mentorName: string
  area: SkillArea
  status: 'available' | 'active' | 'completed'
  successfulSessions: number
  notes: string
}

export type Mentor = {
  wallet: string
  displayName: string
  headline: string
  area: SkillArea
  sessions: number
  rating: number
  badge: string
  levelRequired: number
}

export type Proposal = {
  id: string
  authorWallet: string
  authorName: string
  title: string
  summary: string
  category: string
  status: 'active' | 'passed' | 'draft' | 'closed'
  minLevelToCreate: number
  minScoreToVote: number
  voteRule: string
  supportWeight: number
  rejectWeight: number
}

export type Post = {
  id: string
  authorWallet: string
  authorName: string
  role: Role
  content: string
  tags: string[]
  createdAt: string
}

export type DaoPolicy = {
  levels: Array<{
    level: 0 | 1 | 2 | 3
    scoreRange: string
    label: string
    permissions: string[]
  }>
  projectApprovalRule: string
  validationReward: string
  projectReward: string
  mentoringReward: string
}

export type BootstrapPayload = {
  platform: {
    apiStatus: string
    runtime: string
    network: string
  }
  currentProfile: Profile
  posts: Post[]
  projects: Project[]
  reviewQueue: Project[]
  badges: Badge[]
  mentors: Mentor[]
  mentorings: Mentoring[]
  proposals: Proposal[]
  daoPolicy: DaoPolicy
}

export type CreatePostInput = {
  authorWallet: string
  authorName: string
  role: Role
  content: string
  tags: string[]
}

export type CreateProjectInput = {
  authorWallet: string
  authorName: string
  title: string
  area: SkillArea
  summary: string
  evidenceUrl: string
  repoUrl: string
  demoUrl: string
}

type ReviewInput = {
  reviewerWallet: string
  reviewerName: string
  approve: boolean
  feedback: string
}

type VoteInput = {
  voterWallet: string
  voterName: string
  stance: 'support' | 'reject'
}

export type AuthUser = {
  id: string
  email?: string
  wallet?: string
  displayName: string
  method: 'password' | 'wallet'
}

type AuthResponse = {
  token: string
  user: AuthUser
}

type WalletNonceResponse = {
  nonce: string
  message: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'

async function request<T>(path: string, init?: RequestInit & { token?: string }) {
  const headers = new Headers(init?.headers ?? {})
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (init?.token) {
    headers.set('Authorization', `Bearer ${init.token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...init,
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  bootstrap(wallet?: string, network?: SolanaCluster) {
    const params = new URLSearchParams()
    if (wallet) params.set('wallet', wallet)
    if (network) params.set('network', network)
    const search = params.toString() ? `?${params.toString()}` : ''
    return request<BootstrapPayload>(`/api/bootstrap${search}`)
  },
  createPost(payload: CreatePostInput, token?: string) {
    return request<Post>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    })
  },
  createProject(payload: CreateProjectInput, token?: string) {
    return request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    })
  },
  reviewProject(projectId: string, payload: ReviewInput, token?: string) {
    return request<Project>(`/api/projects/${projectId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    })
  },
  voteProposal(proposalId: string, payload: VoteInput, token?: string) {
    return request<Proposal>(`/api/proposals/${proposalId}/vote`, {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    })
  },
  authRegister(payload: { email: string; password: string; displayName: string }) {
    return request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  authLogin(payload: { email: string; password: string }) {
    return request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  authSolanaNonce(payload: { wallet: string }) {
    return request<WalletNonceResponse>('/api/auth/solana/nonce', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  authSolanaVerify(payload: {
    wallet: string
    nonce: string
    signature: string
    displayName?: string
  }) {
    return request<AuthResponse>('/api/auth/solana/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  authMe(token: string) {
    return request<{ user: AuthUser }>('/api/auth/me', {
      method: 'GET',
      token,
    })
  },
}
