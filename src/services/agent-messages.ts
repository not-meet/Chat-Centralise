import { supabase } from '@/lib/supabase-browser'
import { MessageService } from './messages'
import { Message } from '@/types/chat'
import {
    handleError,
    WhatsAppError,
    DatabaseError,
    withRetry,
} from '@/lib/error-handler'

export class AgentMessageService {
    static async sendMessage(
        conversationId: string,
        to: string,
        content: string,
        agentId: string,
        phoneId: string,
        mediaUrl?: string
    ): Promise<Message> {
        try {
            // Wrap WhatsApp sending in retry mechanism
            await withRetry(
                async () => {
                    try {
                        await MessageService.sendMessage(
                            to,
                            content,
                            phoneId,
                            mediaUrl
                        )
                    } catch (error) {
                        throw new WhatsAppError(
                            'Failed to send WhatsApp message',
                            'message_failed',
                            { to, conversationId, mediaUrl }
                        )
                    }
                },
                { retries: 3, delay: 1000 }
            )

            // Store in Supabase with retry
            const { data: message, error } = await withRetry(
                async () => {
                    return await supabase
                        .from('messages')
                        .insert([
                            {
                                conversation_id: conversationId,
                                content,
                                sender_type: 'agent',
                                sender_id: agentId,
                                message_type: mediaUrl ? 'image' : 'text',
                                status: 'sent',
                                media_url: mediaUrl,
                            },
                        ])
                        .select()
                        .single()
                },
                { retries: 3, delay: 1000 }
            )

            if (error) {
                throw new DatabaseError(
                    'Failed to store message in database',
                    error.code,
                    { conversationId, agentId }
                )
            }

            // Update conversation's last_message_at with retry
            const { error: updateError } = await withRetry(
                async () => {
                    return await supabase
                        .from('conversations')
                        .update({ last_message_at: new Date().toISOString() })
                        .eq('id', conversationId)
                },
                { retries: 3, delay: 1000 }
            )

            if (updateError) {
                handleError(
                    new DatabaseError(
                        'Failed to update conversation timestamp',
                        updateError.code,
                        { conversationId }
                    ),
                    'low' // Lower severity as message was sent successfully
                )
            }

            return message
        } catch (error) {
            handleError(error as Error, 'high', {
                conversationId,
                agentId,
                to,
                hasMedia: !!mediaUrl,
            })
            throw error
        }
    }

    static async updateMessageStatus(
        messageId: string,
        status: Message['status']
    ) {
        try {
            const { error } = await withRetry(
                async () => {
                    return await supabase
                        .from('messages')
                        .update({ status })
                        .eq('id', messageId)
                },
                { retries: 3, delay: 1000 }
            )

            if (error) {
                throw new DatabaseError(
                    'Failed to update message status',
                    error.code,
                    {
                        messageId,
                        status,
                    }
                )
            }
        } catch (error) {
            handleError(error as Error, 'medium', { messageId, status })
            throw error
        }
    }
}
