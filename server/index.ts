import cors from 'cors'
import express from 'express'
import { createPost, createProject, getBootstrap, reviewProject, voteProposal } from './data.js'

const app = express()
const port = 4000

app.use(cors())
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.get('/api/bootstrap', (request, response) => {
  const wallet = typeof request.query.wallet === 'string' ? request.query.wallet : undefined
  response.json(getBootstrap(wallet))
})

app.post('/api/posts', (request, response) => {
  response.status(201).json(createPost(request.body))
})

app.post('/api/projects', (request, response) => {
  response.status(201).json(createProject(request.body))
})

app.post('/api/projects/:projectId/review', (request, response) => {
  response.json(reviewProject(request.params.projectId, request.body))
})

app.post('/api/proposals/:proposalId/vote', (request, response) => {
  response.json(voteProposal(request.params.proposalId, request.body))
})

app.listen(port, () => {
  console.log(`SkillProof API listening on http://localhost:${port}`)
})
