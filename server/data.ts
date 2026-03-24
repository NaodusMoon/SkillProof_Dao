import bcrypt from 'bcryptjs'
import bs58 from 'bs58'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'node:crypto'
import { TextEncoder } from 'node:util'
import { Pool } from 'pg'
import nacl from 'tweetnacl'
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

type Cluster = 'devnet' | 'testnet'

type AuthUser = {
  id: string
  email?: string
  wallet?: string
  displayName: string
  method: 'password' | 'wallet'
}

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres.rixzgdgwktbkvzzsonvx:Contrase%C3%B1a123@aws-0-us-west-2.pooler.supabase.com:5432/postgres'

const JWT_SECRET = process.env.JWT_SECRET ?? 'skillproof-dev-secret-change-me'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d'

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

let initialized = false

const daoPolicySeed: DaoPolicy = {
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

function permissionsFromLevel(level: 0 | 1 | 2 | 3) {
  return {
    canView: true,
    canVote: level >= 1,
    canValidate: level >= 2,
    canMentor: level >= 3,
    canCreateProposal: level >= 2,
  }
}

function toRole(value: string): Role {
  if (value === 'validator' || value === 'mentor') return value
  return 'builder'
}

function asSkillArea(value: string): SkillArea {
  const allowed: SkillArea[] = ['Frontend', 'Protocol', 'Design', 'Community', 'Growth', 'Rust']
  return allowed.includes(value as SkillArea) ? (value as SkillArea) : 'Protocol'
}

function randomExternalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function decodeSignature(signature: string) {
  try {
    return bs58.decode(signature)
  } catch {
    return Buffer.from(signature, 'base64')
  }
}

function signAuthToken(payload: { sub: string; method: 'password' | 'wallet'; email?: string; wallet?: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
}

export function verifyAccessToken(token: string) {
  const decoded = jwt.verify(token, JWT_SECRET)
  if (typeof decoded !== 'object' || !decoded || !('sub' in decoded)) {
    throw new Error('Token invalido')
  }
  return decoded as { sub: string; method: 'password' | 'wallet'; email?: string; wallet?: string }
}

export async function initDatabase() {
  if (initialized) return

  const client = await pool.connect()
  try {
    await client.query('begin')

    await client.query(`
      create table if not exists profiles (
        wallet varchar(64) primary key,
        display_name text not null,
        headline text not null default '',
        primary_role text not null check (primary_role in ('builder','validator','mentor')),
        roles text[] not null default '{}',
        level smallint not null default 0 check (level between 0 and 3),
        score integer not null default 0,
        score_builder integer not null default 0,
        score_validator integer not null default 0,
        score_mentor integer not null default 0,
        mentor_sessions integer not null default 0,
        successful_projects integer not null default 0,
        validations_count integer not null default 0,
        successful_mentorships integer not null default 0,
        vote_weight numeric(10,2) not null default 1,
        can_view boolean not null default true,
        can_vote boolean not null default false,
        can_validate boolean not null default false,
        can_mentor boolean not null default false,
        can_create_proposal boolean not null default false,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists posts (
        id bigserial primary key,
        author_wallet varchar(64) references profiles(wallet) on delete set null,
        author_name text not null,
        role text not null check (role in ('builder','validator','mentor')),
        content text not null,
        tags text[] not null default '{}',
        created_at timestamptz not null default now()
      );

      create table if not exists projects (
        id bigserial primary key,
        external_id text unique,
        author_wallet varchar(64) references profiles(wallet) on delete set null,
        author_name text not null,
        title text not null,
        area text not null,
        summary text not null,
        evidence_url text not null,
        repo_url text not null default '',
        demo_url text not null default '',
        status text not null default 'pending' check (status in ('pending','approved','rejected')),
        approval_rule text not null,
        mentor_suggestion text,
        positive_validations integer not null default 0,
        negative_validations integer not null default 0,
        minted_badge_id bigint,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists validations (
        id bigserial primary key,
        external_id text unique,
        project_id bigint not null references projects(id) on delete cascade,
        validator_wallet varchar(64) references profiles(wallet) on delete set null,
        validator_name text not null,
        approved boolean not null,
        rejection_category text,
        feedback text not null,
        created_at timestamptz not null default now(),
        unique(project_id, validator_wallet)
      );

      create table if not exists badges (
        id bigserial primary key,
        external_id text unique,
        name text not null,
        area text not null,
        description text not null,
        requirement text not null,
        unlock_text text not null,
        holder_wallet varchar(64) references profiles(wallet) on delete cascade,
        project_id bigint references projects(id) on delete set null,
        score_snapshot integer not null default 0,
        soulbound boolean not null default true,
        issued_at timestamptz not null default now()
      );

      do $$
      begin
        if not exists (select 1 from pg_constraint where conname = 'fk_projects_minted_badge') then
          alter table projects
            add constraint fk_projects_minted_badge
            foreign key (minted_badge_id) references badges(id) on delete set null;
        end if;
      end $$;

      create table if not exists mentors (
        wallet varchar(64) primary key references profiles(wallet) on delete cascade,
        display_name text not null,
        headline text not null,
        area text not null,
        sessions integer not null default 0,
        rating numeric(3,2) not null default 0,
        badge text not null default 'Mentor',
        level_required integer not null default 3,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists mentorings (
        id bigserial primary key,
        external_id text unique,
        project_id bigint references projects(id) on delete set null,
        mentee_wallet varchar(64) references profiles(wallet) on delete set null,
        mentee_name text not null,
        mentor_wallet varchar(64) references mentors(wallet) on delete set null,
        mentor_name text not null,
        area text not null,
        status text not null default 'available' check (status in ('available','active','completed')),
        successful_sessions integer not null default 0,
        notes text not null default '',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists proposals (
        id bigserial primary key,
        external_id text unique,
        author_wallet varchar(64) references profiles(wallet) on delete set null,
        author_name text not null,
        title text not null,
        summary text not null,
        category text not null,
        status text not null default 'active' check (status in ('active','passed','draft','closed')),
        min_level_to_create smallint not null default 2,
        min_score_to_vote integer not null default 10,
        vote_rule text not null,
        support_weight numeric(12,2) not null default 0,
        reject_weight numeric(12,2) not null default 0,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists proposal_votes (
        id bigserial primary key,
        proposal_id bigint not null references proposals(id) on delete cascade,
        voter_wallet varchar(64) references profiles(wallet) on delete set null,
        voter_name text not null,
        stance text not null check (stance in ('support','reject')),
        weight numeric(12,2) not null default 1,
        created_at timestamptz not null default now(),
        unique(proposal_id, voter_wallet)
      );

      create table if not exists dao_policy (
        id smallint primary key default 1 check (id = 1),
        project_approval_rule text not null,
        validation_reward text not null,
        project_reward text not null,
        mentoring_reward text not null,
        levels jsonb not null,
        updated_at timestamptz not null default now()
      );

      create table if not exists auth_users (
        id bigserial primary key,
        email text not null unique,
        password_hash text not null,
        display_name text not null,
        created_at timestamptz not null default now()
      );

      create table if not exists auth_wallet_nonces (
        wallet varchar(64) primary key,
        nonce text not null,
        expires_at timestamptz not null,
        used boolean not null default false,
        created_at timestamptz not null default now()
      );

      create index if not exists idx_posts_created_at on posts(created_at desc);
      create index if not exists idx_projects_status_created on projects(status, created_at desc);
      create index if not exists idx_projects_author_wallet on projects(author_wallet);
      create index if not exists idx_validations_project on validations(project_id);
      create index if not exists idx_badges_holder_wallet on badges(holder_wallet);
      create index if not exists idx_mentorings_status on mentorings(status);
      create index if not exists idx_proposals_status on proposals(status);
    `)

    await seedData(client)

    await client.query('commit')
    initialized = true
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

async function seedData(client: { query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> }) {
  const profileCount = await client.query('select count(*)::int as n from profiles')
  if ((profileCount.rows[0].n as number) > 0) {
    await upsertDaoPolicy(client)
    await seedAuthUser(client)
    return
  }

  const camilaWallet = 'DDStEY6cFPaB7LFjeKjr3Ami8Xt8FA8sGd9Qaxmbq5YG'
  const mateoWallet = 'DrP7ydXsaSKJqLqd1eDUKZ3LZhfZS6MhjQSXX9yeZEab'
  const danielWallet = 'J17EhPGKV2A1u2q3xqrnbPHM4gKNHX9bGN9LxnpPoYHK'
  const saraWallet = 'GBbSXVvd8ChTJBz6f9npUsiwuH9NsDpjhKuc16DxUyee'

  await client.query(
    `insert into profiles (
      wallet, display_name, headline, primary_role, roles, level, score,
      score_builder, score_validator, score_mentor,
      mentor_sessions, successful_projects, validations_count, successful_mentorships,
      vote_weight, can_view, can_vote, can_validate, can_mentor, can_create_proposal
    ) values
      ($1,$2,$3,$4,$5,3,742,412,210,120,18,9,26,5,2.4,true,true,true,true,true),
      ($6,$7,$8,$9,$10,3,694,110,184,400,31,2,19,12,2.1,true,true,true,true,true),
      ($11,$12,$13,$14,$15,1,120,120,0,0,0,0,0,0,1,true,true,false,false,false),
      ($16,$17,$18,$19,$20,2,87,62,25,0,0,1,3,0,1.3,true,true,true,false,true)
    on conflict (wallet) do nothing`,
    [
      camilaWallet,
      'Camila Rios',
      'Builder de producto on-chain, validadora y mentora de squads.',
      'builder',
      ['builder', 'validator', 'mentor'],
      mateoWallet,
      'Mateo Forge',
      'Mentor de arquitectura Solana, PDAs y flujos reputacionales.',
      'mentor',
      ['mentor', 'validator'],
      danielWallet,
      'Daniel Vega',
      'Builder frontend para gobernanza y colaboracion.',
      'builder',
      ['builder'],
      saraWallet,
      'Sara Bloom',
      'Mentora de frontend, UX y documentacion evaluable.',
      'mentor',
      ['mentor', 'validator'],
    ],
  )

  const project1 = await client.query(
    `insert into projects (
      external_id, author_wallet, author_name, title, area, summary, evidence_url, repo_url, demo_url,
      status, approval_rule, mentor_suggestion, positive_validations, negative_validations
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    returning id`,
    [
      'project-1',
      camilaWallet,
      'Camila Rios',
      'Hackathon Match Engine',
      'Protocol',
      'Motor que filtra equipos por score, badges y feedback historico.',
      'https://example.com/evidence/match',
      'https://github.com/example/match',
      'https://demo.example.com/match',
      'pending',
      daoPolicySeed.projectApprovalRule,
      'Mateo Forge',
      2,
      0,
    ],
  )

  const project2 = await client.query(
    `insert into projects (
      external_id, author_wallet, author_name, title, area, summary, evidence_url, repo_url, demo_url,
      status, approval_rule, mentor_suggestion, positive_validations, negative_validations
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    returning id`,
    [
      'project-2',
      danielWallet,
      'Daniel Vega',
      'Weighted Governance UI',
      'Frontend',
      'Interfaz de voto con peso reputacional por especialidad verificada.',
      'https://example.com/evidence/gov',
      'https://github.com/example/gov',
      'https://demo.example.com/gov',
      'rejected',
      daoPolicySeed.projectApprovalRule,
      'Sara Bloom',
      0,
      1,
    ],
  )

  const p1 = project1.rows[0].id as number
  const p2 = project2.rows[0].id as number

  await client.query(
    `insert into validations (
      external_id, project_id, validator_wallet, validator_name, approved, rejection_category, feedback
    ) values
      ($1,$2,$3,$4,true,null,$5),
      ($6,$2,$7,$8,true,null,$9),
      ($10,$11,$3,$4,false,'Evidencia insuficiente',$12)
    on conflict do nothing`,
    [
      'validation-1',
      p1,
      mateoWallet,
      'Mateo Forge',
      'La evidencia conecta bien el problema con el resultado y la arquitectura es consistente.',
      'validation-2',
      camilaWallet,
      'Camila Rios',
      'El caso de uso para hackathons esta bien justificado y el filtro por skills es claro.',
      'validation-3',
      p2,
      'La UI esta bien planteada pero falta demostrar uso y criterio de ponderacion real.',
    ],
  )

  await client.query(
    `insert into badges (
      external_id, name, area, description, requirement, unlock_text, holder_wallet, project_id, score_snapshot, soulbound
    ) values
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,true),
      ($10,$11,$12,$13,$14,$15,$7,$16,$17,true)
    on conflict do nothing`,
    [
      'badge-1',
      'Rust Developer',
      'Rust',
      'Acredita ejecucion tecnica consistente en Rust y logica de protocolo.',
      'Aprobar proyectos de logica on-chain o tooling en Rust.',
      'Te posiciona como validador tecnico y mejora tu peso en propuestas de arquitectura.',
      camilaWallet,
      p1,
      510,
      'badge-2',
      'Mentor Activo',
      'Community',
      'Reconoce mentorias que terminan en aprobacion verificable.',
      'Completar mentorias exitosas.',
      'Te vuelve mentor sugerido por el protocolo y base para futuras donaciones.',
      p2,
      670,
    ],
  )

  await client.query(
    `insert into mentors (wallet, display_name, headline, area, sessions, rating, badge, level_required)
     values
      ($1,'Mateo Forge','Mentor de arquitectura Solana, PDAs y flujos reputacionales.','Protocol',31,4.9,'Mentor Activo',3),
      ($2,'Sara Bloom','Mentora de frontend, UX y documentacion evaluable.','Frontend',14,4.7,'Validator Expert',3)
     on conflict (wallet) do nothing`,
    [mateoWallet, saraWallet],
  )

  await client.query(
    `insert into mentorings (
      external_id, project_id, mentee_wallet, mentee_name, mentor_wallet, mentor_name, area, status, successful_sessions, notes
    ) values ($1,$2,$3,$4,$5,$6,$7,'available',12,$8)
    on conflict do nothing`,
    [
      'mentoring-1',
      p2,
      danielWallet,
      'Daniel Vega',
      mateoWallet,
      'Mateo Forge',
      'Frontend',
      'Ideal para reforzar evidencia y criterio de ponderacion.',
    ],
  )

  await client.query(
    `insert into proposals (
      external_id, author_wallet, author_name, title, summary, category, status,
      min_level_to_create, min_score_to_vote, vote_rule, support_weight, reject_weight
    ) values
      ($1,$2,$3,$4,$5,$6,'active',2,10,$7,18.2,3.4),
      ($8,$9,$10,$11,$12,$13,'active',2,10,$7,12.9,2.1)
    on conflict do nothing`,
    [
      'proposal-team-matching',
      camilaWallet,
      'Camila Rios',
      'Activar matching automatico para hackathons',
      'Sugerir equipos a partir de badges, score y afinidad de skills.',
      'Product',
      'El peso del voto es el score actual del votante.',
      'proposal-mentor-donations',
      mateoWallet,
      'Mateo Forge',
      'Habilitar donaciones voluntarias a mentores',
      'Desbloquear donaciones cuando una mentoria termine en badge emitido.',
      'Governance',
    ],
  )

  await client.query(
    `insert into posts (author_wallet, author_name, role, content, tags)
     values
      ($1,'Camila Rios','builder',$2,$3),
      ($4,'Mateo Forge','mentor',$5,$6)`,
    [
      camilaWallet,
      'Subi una demo de weighted governance y necesito revision del score aplicado por badge.',
      ['governance', 'solana', 'review'],
      mateoWallet,
      'Abri mentorias para builders que quieran pasar de MVP a evidencia apta para badge.',
      ['mentor', 'builders'],
    ],
  )

  await upsertDaoPolicy(client)
  await seedAuthUser(client)
}

async function seedAuthUser(client: { query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null }> }) {
  const hash = await bcrypt.hash('SkillProof123!', 10)
  await client.query(
    `insert into auth_users (email, password_hash, display_name)
     values ($1,$2,$3)
     on conflict (email) do nothing`,
    ['demo@skillproof.dev', hash, 'Demo User'],
  )
}

async function upsertDaoPolicy(client: { query: (text: string, values?: unknown[]) => Promise<unknown> }) {
  await client.query(
    `insert into dao_policy (
      id, project_approval_rule, validation_reward, project_reward, mentoring_reward, levels
    ) values ($1,$2,$3,$4,$5,$6::jsonb)
    on conflict (id) do update set
      project_approval_rule = excluded.project_approval_rule,
      validation_reward = excluded.validation_reward,
      project_reward = excluded.project_reward,
      mentoring_reward = excluded.mentoring_reward,
      levels = excluded.levels,
      updated_at = now()`,
    [
      1,
      daoPolicySeed.projectApprovalRule,
      daoPolicySeed.validationReward,
      daoPolicySeed.projectReward,
      daoPolicySeed.mentoringReward,
      JSON.stringify(daoPolicySeed.levels),
    ],
  )
}

function guestProfile(wallet?: string): Profile {
  if (!wallet) {
    return {
      wallet: 'wallet-not-connected',
      displayName: 'Sesion sin wallet',
      headline: 'Conecta tu wallet para cargar perfil y reputacion.',
      primaryRole: 'builder',
      roles: [],
      level: 0,
      score: 0,
      scoreBreakdown: { builder: 0, validator: 0, mentor: 0 },
      mentorSessions: 0,
      successfulProjects: 0,
      validationsCount: 0,
      successfulMentorships: 0,
      voteWeight: 0,
      permissions: permissionsFromLevel(0),
      badges: [],
    }
  }

  return {
    wallet,
    displayName: 'Guest Builder',
    headline: 'Wallet conectada. Aun sin historial verificado.',
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

async function ensureProfileForWallet(wallet: string, name: string, role: Role = 'builder') {
  await pool.query(
    `insert into profiles (wallet, display_name, headline, primary_role, roles, level, score, score_builder, vote_weight, can_view, can_vote)
     values ($1,$2,$3,$4,$5,1,120,120,1,true,true)
     on conflict (wallet) do nothing`,
    [wallet, name, 'Wallet conectada. Perfil inicial.', role, [role]],
  )
}

function mapPostRow(row: Record<string, unknown>): Post {
  return {
    id: String(row.id),
    authorWallet: String(row.author_wallet ?? ''),
    authorName: String(row.author_name),
    role: toRole(String(row.role)),
    content: String(row.content),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    createdAt: new Date(String(row.created_at)).toISOString(),
  }
}

function mapValidationRow(row: Record<string, unknown>): Validation {
  return {
    id: String(row.external_id ?? `validation-${row.id}`),
    projectId: String(row.project_external_id ?? row.project_id),
    validatorWallet: String(row.validator_wallet ?? ''),
    validatorName: String(row.validator_name),
    approved: Boolean(row.approved),
    rejectionCategory: row.rejection_category ? (String(row.rejection_category) as Validation['rejectionCategory']) : undefined,
    feedback: String(row.feedback),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }
}

function mapProjectRow(row: Record<string, unknown>, validations: Validation[]): Project {
  return {
    id: String(row.external_id ?? `project-${row.id}`),
    authorWallet: String(row.author_wallet ?? ''),
    authorName: String(row.author_name),
    title: String(row.title),
    area: asSkillArea(String(row.area)),
    summary: String(row.summary),
    evidenceUrl: String(row.evidence_url),
    repoUrl: String(row.repo_url ?? ''),
    demoUrl: String(row.demo_url ?? ''),
    status: String(row.status) as Project['status'],
    createdAt: new Date(String(row.created_at)).toISOString(),
    positiveValidations: Number(row.positive_validations ?? 0),
    negativeValidations: Number(row.negative_validations ?? 0),
    approvalRule: String(row.approval_rule),
    mentorSuggestion: row.mentor_suggestion ? String(row.mentor_suggestion) : undefined,
    validations,
    mintedBadgeId: row.minted_badge_id ? String(row.minted_badge_id) : undefined,
  }
}

function mapBadgeRow(row: Record<string, unknown>): Badge {
  return {
    id: String(row.external_id ?? `badge-${row.id}`),
    name: String(row.name),
    area: asSkillArea(String(row.area)),
    description: String(row.description),
    requirement: String(row.requirement),
    unlock: String(row.unlock_text),
    holderWallet: String(row.holder_wallet),
    projectId: String(row.project_external_id ?? row.project_id ?? ''),
    scoreSnapshot: Number(row.score_snapshot ?? 0),
    soulbound: Boolean(row.soulbound),
    issuedAt: new Date(String(row.issued_at)).toISOString(),
  }
}

function mapProfileRow(row: Record<string, unknown>, badges: Badge[]): Profile {
  const level = Number(row.level ?? 0) as 0 | 1 | 2 | 3
  return {
    wallet: String(row.wallet),
    displayName: String(row.display_name),
    headline: String(row.headline ?? ''),
    primaryRole: toRole(String(row.primary_role ?? 'builder')),
    roles: Array.isArray(row.roles) ? (row.roles as Role[]) : [],
    level,
    score: Number(row.score ?? 0),
    scoreBreakdown: {
      builder: Number(row.score_builder ?? 0),
      validator: Number(row.score_validator ?? 0),
      mentor: Number(row.score_mentor ?? 0),
    },
    mentorSessions: Number(row.mentor_sessions ?? 0),
    successfulProjects: Number(row.successful_projects ?? 0),
    validationsCount: Number(row.validations_count ?? 0),
    successfulMentorships: Number(row.successful_mentorships ?? 0),
    voteWeight: Number(row.vote_weight ?? 1),
    permissions: {
      canView: Boolean(row.can_view),
      canVote: Boolean(row.can_vote),
      canValidate: Boolean(row.can_validate),
      canMentor: Boolean(row.can_mentor),
      canCreateProposal: Boolean(row.can_create_proposal),
    },
    badges,
  }
}

function mapMentorRow(row: Record<string, unknown>): Mentor {
  return {
    wallet: String(row.wallet),
    displayName: String(row.display_name),
    headline: String(row.headline),
    area: asSkillArea(String(row.area)),
    sessions: Number(row.sessions ?? 0),
    rating: Number(row.rating ?? 0),
    badge: String(row.badge ?? 'Mentor'),
    levelRequired: Number(row.level_required ?? 3),
  }
}

function mapMentoringRow(row: Record<string, unknown>): Mentoring {
  return {
    id: String(row.external_id ?? `mentoring-${row.id}`),
    projectId: String(row.project_external_id ?? row.project_id ?? ''),
    menteeWallet: String(row.mentee_wallet ?? ''),
    menteeName: String(row.mentee_name),
    mentorWallet: String(row.mentor_wallet ?? ''),
    mentorName: String(row.mentor_name),
    area: asSkillArea(String(row.area)),
    status: String(row.status) as Mentoring['status'],
    successfulSessions: Number(row.successful_sessions ?? 0),
    notes: String(row.notes ?? ''),
  }
}

function mapProposalRow(row: Record<string, unknown>): Proposal {
  return {
    id: String(row.external_id ?? `proposal-${row.id}`),
    authorWallet: String(row.author_wallet ?? ''),
    authorName: String(row.author_name),
    title: String(row.title),
    summary: String(row.summary),
    category: String(row.category),
    status: String(row.status) as Proposal['status'],
    minLevelToCreate: Number(row.min_level_to_create ?? 2),
    minScoreToVote: Number(row.min_score_to_vote ?? 10),
    voteRule: String(row.vote_rule),
    supportWeight: Number(row.support_weight ?? 0),
    rejectWeight: Number(row.reject_weight ?? 0),
  }
}

export async function getBootstrap(wallet?: string, network: Cluster = 'devnet'): Promise<BootstrapPayload> {
  await initDatabase()

  const [profileRows, postRows, projectRows, validationRows, badgeRows, mentorRows, mentoringRows, proposalRows, policyRows] = await Promise.all([
    pool.query('select * from profiles order by score desc, created_at asc'),
    pool.query('select * from posts order by created_at desc'),
    pool.query('select * from projects order by created_at desc'),
    pool.query(`
      select v.*, p.external_id as project_external_id
      from validations v
      join projects p on p.id = v.project_id
      order by v.created_at desc
    `),
    pool.query(`
      select b.*, p.external_id as project_external_id
      from badges b
      left join projects p on p.id = b.project_id
      order by b.issued_at desc
    `),
    pool.query('select * from mentors order by sessions desc, rating desc'),
    pool.query(`
      select m.*, p.external_id as project_external_id
      from mentorings m
      left join projects p on p.id = m.project_id
      order by m.created_at desc
    `),
    pool.query('select * from proposals order by created_at desc'),
    pool.query('select * from dao_policy where id = 1'),
  ])

  const validations = validationRows.rows.map(mapValidationRow)
  const validationByProject = new Map<string, Validation[]>()
  for (const validation of validations) {
    const key = validation.projectId
    const list = validationByProject.get(key) ?? []
    list.push(validation)
    validationByProject.set(key, list)
  }

  const projects = projectRows.rows.map((row: Record<string, unknown>) => {
    const pid = String(row.external_id ?? `project-${row.id}`)
    return mapProjectRow(row, validationByProject.get(pid) ?? [])
  })

  const badges = badgeRows.rows.map(mapBadgeRow)
  const badgesByWallet = new Map<string, Badge[]>()
  for (const badge of badges) {
    const list = badgesByWallet.get(badge.holderWallet) ?? []
    list.push(badge)
    badgesByWallet.set(badge.holderWallet, list)
  }

  const profiles = profileRows.rows.map((row: Record<string, unknown>) => mapProfileRow(row, badgesByWallet.get(String(row.wallet)) ?? []))
  const currentProfile = wallet ? profiles.find((item: Profile) => item.wallet === wallet) ?? guestProfile(wallet) : guestProfile()

  const policyRow = policyRows.rows[0]
  const daoPolicy: DaoPolicy = policyRow
    ? {
        levels: (policyRow.levels as DaoPolicy['levels']) ?? daoPolicySeed.levels,
        projectApprovalRule: String(policyRow.project_approval_rule),
        validationReward: String(policyRow.validation_reward),
        projectReward: String(policyRow.project_reward),
        mentoringReward: String(policyRow.mentoring_reward),
      }
    : daoPolicySeed

  return {
    platform: {
      apiStatus: 'online',
      runtime: 'Next.js + Express + Anchor + PostgreSQL',
      network: network === 'testnet' ? 'Solana Testnet' : 'Solana Devnet',
    },
    currentProfile,
    posts: postRows.rows.map(mapPostRow),
    projects,
    reviewQueue: projects.filter((project: Project) => project.status === 'pending' || project.status === 'rejected'),
    badges,
    mentors: mentorRows.rows.map(mapMentorRow),
    mentorings: mentoringRows.rows.map(mapMentoringRow),
    proposals: proposalRows.rows.map(mapProposalRow),
    daoPolicy,
  }
}

export async function createPost(input: {
  authorWallet: string
  authorName: string
  role: Role
  content: string
  tags: string[]
}): Promise<Post> {
  await initDatabase()
  await ensureProfileForWallet(input.authorWallet, input.authorName, input.role)

  const result = await pool.query(
    `insert into posts (author_wallet, author_name, role, content, tags)
     values ($1,$2,$3,$4,$5)
     returning *`,
    [input.authorWallet, input.authorName, input.role, input.content, input.tags],
  )

  return mapPostRow(result.rows[0])
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  await initDatabase()
  await ensureProfileForWallet(input.authorWallet, input.authorName, 'builder')

  const externalId = randomExternalId('project')
  const result = await pool.query(
    `insert into projects (
      external_id, author_wallet, author_name, title, area, summary, evidence_url, repo_url, demo_url,
      status, approval_rule, mentor_suggestion
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$11)
    returning *`,
    [
      externalId,
      input.authorWallet,
      input.authorName,
      input.title,
      input.area,
      input.summary,
      input.evidenceUrl,
      input.repoUrl,
      input.demoUrl,
      daoPolicySeed.projectApprovalRule,
      input.area === 'Protocol' ? 'Mateo Forge' : 'Sara Bloom',
    ],
  )

  return mapProjectRow(result.rows[0], [])
}

async function getProjectInternalByExternal(externalId: string) {
  const result = await pool.query('select * from projects where external_id = $1', [externalId])
  return result.rows[0] as Record<string, unknown> | undefined
}

async function getProposalInternalByExternal(externalId: string) {
  const result = await pool.query('select * from proposals where external_id = $1', [externalId])
  return result.rows[0] as Record<string, unknown> | undefined
}

export async function reviewProject(
  projectId: string,
  input: {
    reviewerWallet: string
    reviewerName: string
    approve: boolean
    feedback: string
  },
): Promise<Project> {
  await initDatabase()
  await ensureProfileForWallet(input.reviewerWallet, input.reviewerName, 'validator')

  const project = await getProjectInternalByExternal(projectId)
  if (!project) throw new Error('Project not found')

  const internalId = Number(project.id)

  await pool.query(
    `insert into validations (
      external_id, project_id, validator_wallet, validator_name, approved, rejection_category, feedback
    ) values ($1,$2,$3,$4,$5,$6,$7)
    on conflict (project_id, validator_wallet)
    do update set
      approved = excluded.approved,
      rejection_category = excluded.rejection_category,
      feedback = excluded.feedback,
      validator_name = excluded.validator_name,
      created_at = now()`,
    [
      randomExternalId('validation'),
      internalId,
      input.reviewerWallet,
      input.reviewerName,
      input.approve,
      input.approve ? null : 'Evidencia insuficiente',
      input.feedback,
    ],
  )

  const counters = await pool.query(
    `select
      count(*) filter (where approved = true)::int as positive,
      count(*) filter (where approved = false)::int as negative
     from validations
     where project_id = $1`,
    [internalId],
  )

  const positive = Number(counters.rows[0].positive ?? 0)
  const negative = Number(counters.rows[0].negative ?? 0)
  const status = input.approve ? (positive >= 3 ? 'approved' : 'pending') : 'rejected'

  const updated = await pool.query(
    `update projects
     set positive_validations = $1,
         negative_validations = $2,
         status = $3,
         updated_at = now()
     where id = $4
     returning *`,
    [positive, negative, status, internalId],
  )

  const validationRows = await pool.query(
    `select v.*, p.external_id as project_external_id
     from validations v
     join projects p on p.id = v.project_id
     where v.project_id = $1
     order by v.created_at desc`,
    [internalId],
  )

  await pool.query(
    `insert into posts (author_wallet, author_name, role, content, tags)
     values ($1,$2,'validator',$3,$4)`,
    [
      input.reviewerWallet,
      input.reviewerName,
      input.approve
        ? `Aprobe ${String(project.title)}. La entrega ya esta mas cerca de convertirse en badge.`
        : `Marque ${String(project.title)} para reintento con feedback y ruta de mejora.`,
      ['review', String(project.area).toLowerCase()],
    ],
  )

  return mapProjectRow(updated.rows[0], validationRows.rows.map(mapValidationRow))
}

export async function voteProposal(
  proposalId: string,
  input: {
    voterWallet: string
    voterName: string
    stance: 'support' | 'reject'
  },
): Promise<Proposal> {
  await initDatabase()
  await ensureProfileForWallet(input.voterWallet, input.voterName, 'builder')

  const proposal = await getProposalInternalByExternal(proposalId)
  if (!proposal) throw new Error('Proposal not found')

  const profileWeight = await pool.query('select vote_weight from profiles where wallet = $1', [input.voterWallet])
  const weight = Number(profileWeight.rows[0]?.vote_weight ?? 1)
  const internalId = Number(proposal.id)

  await pool.query(
    `insert into proposal_votes (proposal_id, voter_wallet, voter_name, stance, weight)
     values ($1,$2,$3,$4,$5)
     on conflict (proposal_id, voter_wallet)
     do update set stance = excluded.stance, weight = excluded.weight, voter_name = excluded.voter_name, created_at = now()`,
    [internalId, input.voterWallet, input.voterName, input.stance, weight],
  )

  const totals = await pool.query(
    `select
      coalesce(sum(weight) filter (where stance = 'support'), 0)::numeric as support,
      coalesce(sum(weight) filter (where stance = 'reject'), 0)::numeric as reject
     from proposal_votes
     where proposal_id = $1`,
    [internalId],
  )

  const updated = await pool.query(
    `update proposals
     set support_weight = $1,
         reject_weight = $2,
         updated_at = now()
     where id = $3
     returning *`,
    [totals.rows[0].support, totals.rows[0].reject, internalId],
  )

  await pool.query(
    `insert into posts (author_wallet, author_name, role, content, tags)
     values ($1,$2,'builder',$3,$4)`,
    [
      input.voterWallet,
      input.voterName,
      `${input.voterName} voto ${input.stance === 'support' ? 'a favor' : 'en contra'} de ${String(proposal.title)} con peso ${weight.toFixed(1)}x.`,
      ['governance', 'vote'],
    ],
  )

  return mapProposalRow(updated.rows[0])
}

export async function registerPasswordAuth(input: { email: string; password: string; displayName: string }) {
  await initDatabase()

  const email = input.email.trim().toLowerCase()
  if (!email || input.password.length < 8) {
    throw new Error('Credenciales invalidas')
  }

  const hash = await bcrypt.hash(input.password, 10)

  const created = await pool.query(
    `insert into auth_users (email, password_hash, display_name)
     values ($1,$2,$3)
     on conflict (email) do nothing
     returning id, email, display_name`,
    [email, hash, input.displayName.trim() || 'User'],
  )

  if (created.rowCount === 0) {
    throw new Error('Este email ya esta registrado')
  }

  const row = created.rows[0]
  const token = signAuthToken({ sub: String(row.id), method: 'password', email: String(row.email) })

  return {
    token,
    user: {
      id: String(row.id),
      email: String(row.email),
      displayName: String(row.display_name),
      method: 'password' as const,
    },
  }
}

export async function loginPasswordAuth(input: { email: string; password: string }) {
  await initDatabase()

  const email = input.email.trim().toLowerCase()
  const result = await pool.query(
    `select id, email, display_name, password_hash
     from auth_users
     where email = $1`,
    [email],
  )

  if (!result.rows[0]) throw new Error('Credenciales invalidas')

  const row = result.rows[0]
  const ok = await bcrypt.compare(input.password, String(row.password_hash))
  if (!ok) throw new Error('Credenciales invalidas')

  const token = signAuthToken({ sub: String(row.id), method: 'password', email: String(row.email) })

  return {
    token,
    user: {
      id: String(row.id),
      email: String(row.email),
      displayName: String(row.display_name),
      method: 'password' as const,
    },
  }
}

export async function createWalletNonce(input: { wallet: string }) {
  await initDatabase()

  const wallet = input.wallet.trim()
  if (!wallet) throw new Error('Wallet requerida')

  const nonce = randomBytes(16).toString('hex')
  await pool.query(
    `insert into auth_wallet_nonces (wallet, nonce, expires_at, used)
     values ($1,$2,now() + interval '10 minutes', false)
     on conflict (wallet)
     do update set nonce = excluded.nonce, expires_at = excluded.expires_at, used = false, created_at = now()`,
    [wallet, nonce],
  )

  const message = `SkillProof login nonce: ${nonce}`
  return { nonce, message }
}

export async function verifyWalletLogin(input: { wallet: string; nonce: string; signature: string; displayName?: string }) {
  await initDatabase()

  const wallet = input.wallet.trim()
  const nonce = input.nonce.trim()
  if (!wallet || !nonce || !input.signature) throw new Error('Datos incompletos')

  const nonceRow = await pool.query(
    `select wallet, nonce, expires_at, used
     from auth_wallet_nonces
     where wallet = $1 and nonce = $2`,
    [wallet, nonce],
  )

  if (!nonceRow.rows[0]) throw new Error('Nonce invalido')
  const record = nonceRow.rows[0]
  if (Boolean(record.used)) throw new Error('Nonce ya utilizado')
  if (new Date(String(record.expires_at)).getTime() < Date.now()) throw new Error('Nonce expirado')

  const messageBytes = new TextEncoder().encode(`SkillProof login nonce: ${nonce}`)
  const signatureBytes = decodeSignature(input.signature)
  const publicKeyBytes = bs58.decode(wallet)

  const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
  if (!valid) throw new Error('Firma invalida')

  await pool.query('update auth_wallet_nonces set used = true where wallet = $1', [wallet])
  await ensureProfileForWallet(wallet, input.displayName?.trim() || 'Wallet User', 'builder')

  const token = signAuthToken({ sub: wallet, method: 'wallet', wallet })

  const profile = await pool.query('select wallet, display_name from profiles where wallet = $1', [wallet])

  return {
    token,
    user: {
      id: String(wallet),
      wallet,
      displayName: String(profile.rows[0]?.display_name ?? 'Wallet User'),
      method: 'wallet' as const,
    },
  }
}

export async function getAuthUserFromTokenPayload(payload: { sub: string; method: 'password' | 'wallet'; email?: string; wallet?: string }): Promise<AuthUser | null> {
  await initDatabase()

  if (payload.method === 'password') {
    const result = await pool.query('select id, email, display_name from auth_users where id = $1', [payload.sub])
    if (!result.rows[0]) return null
    const row = result.rows[0]
    return {
      id: String(row.id),
      email: String(row.email),
      displayName: String(row.display_name),
      method: 'password',
    }
  }

  const wallet = payload.wallet ?? payload.sub
  const result = await pool.query('select wallet, display_name from profiles where wallet = $1', [wallet])
  if (!result.rows[0]) return null

  return {
    id: String(wallet),
    wallet: String(wallet),
    displayName: String(result.rows[0].display_name),
    method: 'wallet',
  }
}
