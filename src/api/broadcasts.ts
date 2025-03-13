import express from 'express'
import { BroadcastWorkerService } from '../services/broadcast-worker.service'

const router = express.Router()

// Process pending broadcasts
router.post('/process', async (req, res) => {
    try {
        await BroadcastWorkerService.processPendingBroadcasts()
        res.json({ success: true })
    } catch (error) {
        console.error('Error processing broadcasts:', error)
        res.status(500).json({ error: 'Failed to process broadcasts' })
    }
})

// Send a specific broadcast
router.post('/:id/send', async (req, res) => {
    try {
        const { id } = req.params
        await BroadcastWorkerService.processBroadcast(id)
        res.json({ success: true })
    } catch (error) {
        console.error('Error sending broadcast:', error)
        res.status(500).json({ error: 'Failed to send broadcast' })
    }
})

export default router
