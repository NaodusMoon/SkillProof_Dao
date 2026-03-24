import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import {
  createPost,
  createProject,
  createWalletNonce,
  getAuthUserFromTokenPayload,
  getBootstrap,
  initDatabase,
  loginPasswordAuth,
  registerPasswordAuth,
  reviewProject,
  verifyAccessToken,
  verifyWalletLogin,
  voteProposal,
} from './data.js'

const app = express()
const port = Number(process.env.PORT ?? 4000)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

function parseBearerToken(request: Request) {
  const auth = request.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice('Bearer '.length)
}

function asyncHandler(
  fn: (request: Request, response: Response, next: NextFunction) => Promise<void>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    fn(request, response, next).catch(next)
  }
}

type SessionUser = {
  id: string
  email?: string
  wallet?: string
  displayName: string
  method: 'password' | 'wallet'
}

async function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const token = parseBearerToken(request)
    if (!token) {
      response.status(401).json({ error: 'Token requerido' })
      return
    }

    const payload = verifyAccessToken(token)
    const user = await getAuthUserFromTokenPayload(payload)
    if (!user) {
      response.status(401).json({ error: 'Sesion no valida' })
      return
    }

    response.locals.authUser = user as SessionUser
    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sesion no valida'
    response.status(401).json({ error: message })
  }
}

async function requireWalletAuth(request: Request, response: Response, next: NextFunction) {
  await requireAuth(request, response, async () => {
    const user = response.locals.authUser as SessionUser | undefined
    if (!user || user.method !== 'wallet' || !user.wallet) {
      response.status(403).json({ error: 'Debes iniciar sesion con wallet para esta accion.' })
      return
    }
    next()
  })
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.get(
  '/api/bootstrap',
  asyncHandler(async (request, response) => {
    const wallet = typeof request.query.wallet === 'string' ? request.query.wallet : undefined
    const network = request.query.network === 'testnet' ? 'testnet' : 'devnet'
    response.json(await getBootstrap(wallet, network))
  }),
)

app.post(
  '/api/posts',
  requireWalletAuth,
  asyncHandler(async (request, response) => {
    const user = response.locals.authUser as SessionUser
    response.status(201).json(
      await createPost({
        ...request.body,
        authorWallet: user.wallet as string,
        authorName: user.displayName,
      }),
    )
  }),
)

app.post(
  '/api/projects',
  requireWalletAuth,
  asyncHandler(async (request, response) => {
    const user = response.locals.authUser as SessionUser
    response.status(201).json(
      await createProject({
        ...request.body,
        authorWallet: user.wallet as string,
        authorName: user.displayName,
      }),
    )
  }),
)

app.post(
  '/api/projects/:projectId/review',
  requireWalletAuth,
  asyncHandler(async (request, response) => {
    const user = response.locals.authUser as SessionUser
    response.json(
      await reviewProject(String(request.params.projectId), {
        ...request.body,
        reviewerWallet: user.wallet as string,
        reviewerName: user.displayName,
      }),
    )
  }),
)

app.post(
  '/api/proposals/:proposalId/vote',
  requireWalletAuth,
  asyncHandler(async (request, response) => {
    const user = response.locals.authUser as SessionUser
    response.json(
      await voteProposal(String(request.params.proposalId), {
        ...request.body,
        voterWallet: user.wallet as string,
        voterName: user.displayName,
      }),
    )
  }),
)

app.post(
  '/api/auth/register',
  asyncHandler(async (request, response) => {
    response.status(201).json(
      await registerPasswordAuth({
        email: String(request.body?.email ?? ''),
        password: String(request.body?.password ?? ''),
        displayName: String(request.body?.displayName ?? ''),
      }),
    )
  }),
)

app.post(
  '/api/auth/login',
  asyncHandler(async (request, response) => {
    response.json(
      await loginPasswordAuth({
        email: String(request.body?.email ?? ''),
        password: String(request.body?.password ?? ''),
      }),
    )
  }),
)

app.post(
  '/api/auth/solana/nonce',
  asyncHandler(async (request, response) => {
    response.json(
      await createWalletNonce({
        wallet: String(request.body?.wallet ?? ''),
      }),
    )
  }),
)

app.post(
  '/api/auth/solana/verify',
  asyncHandler(async (request, response) => {
    response.json(
      await verifyWalletLogin({
        wallet: String(request.body?.wallet ?? ''),
        nonce: String(request.body?.nonce ?? ''),
        signature: String(request.body?.signature ?? ''),
        displayName: typeof request.body?.displayName === 'string' ? request.body.displayName : undefined,
      }),
    )
  }),
)

app.get(
  '/api/auth/me',
  asyncHandler(async (request, response) => {
    const token = parseBearerToken(request)
    if (!token) {
      response.status(401).json({ error: 'Token requerido' })
      return
    }

    const payload = verifyAccessToken(token)
    const user = await getAuthUserFromTokenPayload(payload)
    if (!user) {
      response.status(401).json({ error: 'Sesion no valida' })
      return
    }

    response.json({ user })
  }),
)

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : 'Internal server error'
  const lower = message.toLowerCase()
  const status =
    lower.includes('credenciales') ||
    lower.includes('token') ||
    lower.includes('firma') ||
    lower.includes('nonce') ||
    lower.includes('requerida')
      ? 401
      : lower.includes('not found')
        ? 404
        : 400

  response.status(status).json({ error: message })
})

async function start() {
  await initDatabase()
  app.listen(port, () => {
    console.log(`SkillProof API listening on http://localhost:${port}`)
  })
}

start().catch((error) => {
  console.error('Failed to start API:', error)
  process.exit(1)
})
