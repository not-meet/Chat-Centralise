import dotenv from 'dotenv'
// Load environment variables first
dotenv.config()

import express from 'express'
import cors from 'cors'
import webhookRouter from './api/webhook'
import messagesRouter from './api/messages'
import broadcastsRouter from './api/broadcasts'
import agentsRouter from './api/agents'
import { config } from './config/server'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/webhook', webhookRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/broadcasts', broadcastsRouter)
app.use('/api/agents', agentsRouter)

// Error handling
app.use(
    (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        console.error(err.stack)
        res.status(500).send('Something broke!')
    }
)

// Start server
app.listen(config.server.port, () => {
    console.log(`Server is running on port ${config.server.port}`)
})
