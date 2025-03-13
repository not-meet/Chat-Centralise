import { WhatsAppService } from './services/whatsapp.service'

async function testMessage() {
    try {
        console.log('Initializing WhatsApp service...')

        // Force initialization
        if (!WhatsAppService.isInitialized()) {
            WhatsAppService.initialize()
        }

        console.log('Sending test message...')
        const message = await WhatsAppService.sendMessage(
            '919182302594', // Your number
            'Test message from Node.js with improved logging 🚀\nPlease reply if you receive this.'
        )

        console.log('Message details:', {
            sid: message.sid,
            status: message.status,
            errorCode: message.errorCode,
            errorMessage: message.errorMessage,
            direction: message.direction,
            from: message.from,
            to: message.to,
        })
    } catch (error) {
        console.error('Detailed error:', {
            name: error.name,
            message: error.message,
            code: error.code,
            status: error.status,
            moreInfo: error.moreInfo,
            stack: error.stack,
        })
    }
}

testMessage()
