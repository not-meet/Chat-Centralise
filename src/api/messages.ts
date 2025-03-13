import express, { RequestHandler } from 'express'
import { WhatsAppService } from '../services/whatsapp.service'

const router = express.Router()

const sendMessage: RequestHandler = async (req, res) => {
    try {
        const { to, content, mediaUrl, phoneId } = req.body
        if (!to || !content) {
            res.status(400).json({ error: 'Missing required fields' })
            return
        }

        const result = await WhatsAppService.sendMessage(
            to,
            content,
            phoneId,
            mediaUrl
        )
        res.json(result)
        return
    } catch (error) {
        console.error('Error sending message:', error)
        res.status(500).json({ error: 'Failed to send message' })
        return
    }
}

router.post('/send', sendMessage)

export default router
