import express from 'express'
import { supabase } from '../lib/supabase-server'
import crypto from 'crypto'

const router = express.Router()

// Helper function to clean phone numbers
function cleanPhoneNumber(phone: string): string {
    return phone.replace('whatsapp:', '').replace('+', '').trim()
}

// Helper function for original phone number
function formatWhatsAppNumber(id: string): string {
    return 'whatsapp:+' + id.replace('@c.us', '')
}

// Helper function to generate UUID
function generateUUID(): string {
    return crypto.randomUUID()
}

// Test endpoint
router.get('/test', (req, res) => {
    console.log('Test endpoint hit')
    res.json({ message: 'Webhook route is working' })
})

router.post('/whatsapp', async (req, res) => {
    try {
        console.log('Webhook hit: Incoming WhatsApp message')
        console.log('Request body:', req.body)

        // Skip non-message webhooks or outbound messages
        if (
            req.body.type !== 'message' ||
            !req.body.message ||
            req.body.message.subtype === 'group/invite' ||
            req.body.conversation.includes('@g.us') ||
            req.body.message.subtype?.includes('call/')
        ) {
            console.log('Skipping non-message or outbound message webhook')
            res.json({ success: true })
            return
        }

        // Check if message is more than 5 minutes old
        const messageTimestamp = req.body.timestamp * 1000 // Convert to milliseconds
        const currentTime = Date.now()
        const fiveMinutesInMs = 5 * 60 * 1000

        if (currentTime - messageTimestamp > fiveMinutesInMs) {
            console.log('Skipping message that is more than 5 minutes old', {
                messageTime: new Date(messageTimestamp).toISOString(),
                currentTime: new Date(currentTime).toISOString(),
                differenceMinutes: (currentTime - messageTimestamp) / 60000,
            })
            res.json({ success: true })
            return
        }

        const {
            message: { text: content = '', type: messageType, url: mediaUrl },
            user: { phone: From },
        } = req.body

        const messageSid = `maytapi_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 15)}`

        // Handle media content
        const finalMediaUrl = ['image', 'video', 'audio'].includes(messageType)
            ? mediaUrl || content || null
            : null

        const cleanedPhone = cleanPhoneNumber(From)
        const originalPhone = formatWhatsAppNumber(req.body.user.id)
        console.log('Cleaned phone number:', cleanedPhone)

        // First, try to find existing contact
        console.log('Searching for existing contact...')
        const { data: existingContact, error: contactSearchError } =
            await supabase
                .from('contacts')
                .select('*')
                .eq('phone', cleanedPhone)
                .single()

        if (contactSearchError && contactSearchError.code !== 'PGRST116') {
            console.error('Error searching for contact:', contactSearchError)
            throw contactSearchError
        }

        let contactId
        if (existingContact) {
            // Update the existing contact's metadata
            console.log('Existing contact found. Updating last_contacted_at...')
            const { error: updateError } = await supabase
                .from('contacts')
                .update({ last_contacted_at: new Date().toISOString() })
                .eq('id', existingContact.id)

            if (updateError) {
                console.error(
                    'Error updating contact last_contacted_at:',
                    updateError
                )
                throw updateError
            }
            contactId = existingContact.id
        } else {
            console.log('No existing contact found. Creating new one...')
            const { data: newContact, error: contactCreateError } =
                await supabase
                    .from('contacts')
                    .insert([
                        {
                            phone: cleanedPhone,
                            wa_id: cleanedPhone,
                            full_name: cleanedPhone, // Use phone as full name if not available
                            status: 'active',
                            last_contacted_at: new Date().toISOString(),
                            metadata: {
                                original_phone: originalPhone,
                                profile_name: cleanedPhone,
                            },
                        },
                    ])
                    .select()
                    .single()

            if (contactCreateError) {
                console.error('Error creating contact:', contactCreateError)
                throw contactCreateError
            }
            console.log('New contact created:', newContact)
            contactId = newContact.id
        }

        // Now search for existing conversation
        console.log('Searching for existing conversation...')
        const { data: conversations, error: searchError } = await supabase
            .from('conversations')
            .select('*')
            .eq('contact_id', contactId)

        if (searchError) {
            console.error('Error searching for conversation:', searchError)
            throw searchError
        }

        const existingConversation =
            conversations && conversations.length > 0 ? conversations[0] : null
        console.log('Search result:', existingConversation)

        let conversationId

        if (!existingConversation) {
            console.log('No existing conversation found. Creating new one...')
            // Create new conversation with contact_id
            const { data: newConversation, error: createError } = await supabase
                .from('conversations')
                .insert([
                    {
                        contact_id: contactId,
                        status: 'needs-response',
                        metadata: {
                            phone: cleanedPhone,
                            original_phone: originalPhone,
                            profile_name: cleanedPhone,
                            phoneId: req.body.phoneId,
                        },
                    },
                ])
                .select()
                .single()

            if (createError) {
                console.error('Error creating conversation:', createError)
                throw createError
            }

            console.log('New conversation created:', newConversation)
            conversationId = newConversation.id
        } else {
            console.log('Using existing conversation')
            conversationId = existingConversation.id

            // Update the phoneId in the existing conversation's metadata
            const { error: updateConversationError } = await supabase
                .from('conversations')
                .update({
                    metadata: {
                        ...existingConversation.metadata,
                        phoneId: req.body.phoneId, // Update phoneId
                    },
                })
                .eq('id', conversationId)

            if (updateConversationError) {
                console.error(
                    'Error updating conversation phoneId:',
                    updateConversationError
                )
                throw updateConversationError
            }
        }

        if (!conversationId) {
            throw new Error('Failed to get valid conversation ID')
        }

        console.log('Storing message with conversation_id:', conversationId)

        // Store the message
        const { data: newMessage, error: messageError } = await supabase
            .from('messages')
            .insert([
                {
                    conversation_id: conversationId,
                    content: content,
                    sender_type: req.body.message.fromMe ? 'agent' : 'contact',
                    sender_id: contactId,
                    message_type: req.body.message.type,
                    status: 'delivered',
                    media_url: mediaUrl,
                    metadata: {
                        maytapi_message_sid: messageSid,
                        original_sender: originalPhone,
                        profile_name: cleanedPhone,
                    },
                },
            ])
            .select()

        if (messageError) {
            console.error('Error storing message:', messageError)
            throw messageError
        }

        console.log('Message stored successfully:', newMessage)

        // Update conversation's last_message_at
        const { error: updateError } = await supabase
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversationId)

        if (updateError) {
            console.error('Error updating conversation:', updateError)
            // Don't throw here as the message was already stored successfully
        }

        // Send a simple JSON response appropriate for Maytapi
        res.json({ success: true })

        console.log('Webhook completed successfully')
    } catch (error) {
        console.error('Webhook error:', error)
        // Send an error response appropriate for an API
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        })
    }
})

export default router
