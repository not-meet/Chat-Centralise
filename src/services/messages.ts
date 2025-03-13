const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export class MessageService {
    static async sendMessage(
        to: string,
        content: string,
        phoneId: string,
        mediaUrl?: string
    ) {
        try {
            const response = await fetch(`${API_URL}/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to,
                    content,
                    mediaUrl,
                    phoneId,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to send message')
            }

            return await response.json()
        } catch (error) {
            console.error('Error sending message:', error)
            throw error
        }
    }
}
