import { supabase } from '@/lib/supabase-server'
import { WhatsAppService } from './whatsapp.service'
import {
    handleError,
    WhatsAppError,
    DatabaseError,
    withRetry,
} from '@/lib/error-handler'

const BATCH_SIZE = 10 // Process 10 messages at a time
const RATE_LIMIT_DELAY = 1000 // 1 second between messages for sandbox

interface BroadcastRecipient {
    id: string
    broadcast_id: string
    phone_number: string
    status: 'pending' | 'sent' | 'failed'
    error_message?: string
    phoneId: string
}

interface Broadcast {
    id: string
    message_content: string
    message_type: 'text' | 'image' | 'template'
    media_url?: string
    status: 'pending' | 'sending' | 'sent' | 'failed'
    sent_count: number
    failed_count: number
}

export class BroadcastWorkerService {
    private static async sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    private static async updateBroadcastStatus(
        broadcastId: string,
        status: Broadcast['status'],
        sentCount: number,
        failedCount: number
    ) {
        const { error } = await supabase
            .from('broadcasts')
            .update({
                status,
                sent_count: sentCount,
                failed_count: failedCount,
            })
            .eq('id', broadcastId)

        if (error) {
            throw new DatabaseError(
                'Failed to update broadcast status',
                error.code,
                {
                    broadcastId,
                    status,
                }
            )
        }
    }

    private static async updateRecipientStatus(
        recipientId: string,
        status: BroadcastRecipient['status'],
        errorMessage?: string
    ) {
        const { error } = await supabase
            .from('broadcast_recipients')
            .update({
                status,
                error_message: errorMessage,
                sent_at: status === 'sent' ? new Date().toISOString() : null,
            })
            .eq('id', recipientId)

        if (error) {
            throw new DatabaseError(
                'Failed to update recipient status',
                error.code,
                {
                    recipientId,
                    status,
                }
            )
        }
    }

    private static async sendBatchMessages(
        broadcast: Broadcast,
        recipients: BroadcastRecipient[]
    ) {
        let sentCount = 0
        let failedCount = 0

        for (const recipient of recipients) {
            try {
                // Rate limiting
                await this.sleep(RATE_LIMIT_DELAY)
                if (!recipient.phone_number) {
                    throw new Error('Invalid phone number: empty')
                }

                let cleanedPhone = recipient.phone_number
                    .replace('whatsapp:', '')
                    .trim()

                if (!cleanedPhone.startsWith('+')) {
                    cleanedPhone = '+' + cleanedPhone
                }

                if (cleanedPhone.length < 10) {
                    throw new Error(
                        `Invalid phone number format: ${cleanedPhone}`
                    )
                }

                await withRetry(
                    async () => {
                        await WhatsAppService.sendMessage(
                            cleanedPhone,
                            broadcast.message_content,
                            recipient.phoneId,
                            broadcast.media_url
                        )
                    },
                    {
                        retries: 3,
                        delay: 1000,
                        onError: (error) => {
                            if (error instanceof WhatsAppError) {
                                if (error.isRateLimitError) {
                                    console.log('Rate limit hit, retrying...')
                                    return true
                                }
                                if (error.code === 'invalid_number') {
                                    console.log(
                                        'Invalid number, skipping retry'
                                    )
                                    return false
                                }
                            }
                            return false // Don't retry on other errors
                        },
                    }
                )

                // Update recipient status
                await this.updateRecipientStatus(recipient.id, 'sent')
                sentCount++

                console.log(`Successfully sent message to ${cleanedPhone}`)
            } catch (error) {
                console.error(
                    `Failed to send message to ${recipient.phone_number}:`,
                    error
                )

                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : 'Unknown error occurred while sending message'

                await this.updateRecipientStatus(
                    recipient.id,
                    'failed',
                    errorMessage
                )
                failedCount++
            }
        }

        return { sentCount, failedCount }
    }

    static async processBroadcast(broadcastId: string) {
        try {
            // Get the broadcast
            const { data: broadcast, error: fetchError } = await supabase
                .from('broadcasts')
                .select('*')
                .eq('id', broadcastId)
                .single()

            if (fetchError || !broadcast) {
                throw new DatabaseError(
                    'Failed to fetch broadcast',
                    fetchError?.code || 'NOT_FOUND',
                    { broadcastId }
                )
            }

            // No need to update status here since it's already 'pending'

            let totalSent = 0
            let totalFailed = 0

            while (true) {
                // Get next batch of pending recipients
                const { data: recipients, error: recipientsError } =
                    await supabase
                        .from('broadcast_recipients')
                        .select('*')
                        .eq('broadcast_id', broadcast.id)
                        .eq('status', 'pending')
                        .limit(BATCH_SIZE)

                if (recipientsError) throw recipientsError
                if (!recipients || recipients.length === 0) break

                // Process batch
                const { sentCount, failedCount } = await this.sendBatchMessages(
                    broadcast,
                    recipients
                )

                totalSent += sentCount
                totalFailed += failedCount

                // Update broadcast counts without changing status
                await this.updateBroadcastStatus(
                    broadcast.id,
                    'pending',
                    totalSent,
                    totalFailed
                )
            }

            // Update final broadcast status
            const processedCount = totalSent + totalFailed
            await this.updateBroadcastStatus(
                broadcast.id,
                totalFailed === processedCount ? 'failed' : 'sent',
                totalSent,
                totalFailed
            )

            return { totalSent, totalFailed }
        } catch (error) {
            console.error('Error processing broadcast:', broadcastId, error)

            // Update broadcast status to failed
            await this.updateBroadcastStatus(broadcastId, 'failed', 0, 0)

            handleError(error as Error, 'high', {
                broadcastId,
                stage: 'broadcast_processing',
            })

            throw error
        }
    }

    static async processPendingBroadcasts() {
        try {
            // Get pending broadcasts ordered by creation time
            const { data: broadcasts, error: fetchError } = await supabase
                .from('broadcasts')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })

            if (fetchError) throw fetchError
            if (!broadcasts || broadcasts.length === 0) return

            for (const broadcast of broadcasts) {
                try {
                    // Update broadcast to sending
                    await this.updateBroadcastStatus(
                        broadcast.id,
                        'sending',
                        0,
                        0
                    )

                    let processedCount = 0
                    let totalSent = 0
                    let totalFailed = 0

                    while (true) {
                        // Get next batch of pending recipients
                        const { data: recipients, error: recipientsError } =
                            await supabase
                                .from('broadcast_recipients')
                                .select('*')
                                .eq('broadcast_id', broadcast.id)
                                .eq('status', 'pending')
                                .limit(BATCH_SIZE)

                        if (recipientsError) throw recipientsError
                        if (!recipients || recipients.length === 0) break

                        // Process batch
                        const { sentCount, failedCount } =
                            await this.sendBatchMessages(broadcast, recipients)

                        totalSent += sentCount
                        totalFailed += failedCount
                        processedCount += recipients.length

                        // Update broadcast counts
                        await this.updateBroadcastStatus(
                            broadcast.id,
                            'sending',
                            totalSent,
                            totalFailed
                        )
                    }

                    // Update final broadcast status
                    await this.updateBroadcastStatus(
                        broadcast.id,
                        totalFailed === processedCount ? 'failed' : 'sent',
                        totalSent,
                        totalFailed
                    )
                } catch (error) {
                    console.error(
                        'Error processing broadcast:',
                        broadcast.id,
                        error
                    )

                    // Update broadcast status to failed
                    await this.updateBroadcastStatus(
                        broadcast.id,
                        'failed',
                        broadcast.sent_count,
                        broadcast.failed_count
                    )

                    handleError(error as Error, 'high', {
                        broadcastId: broadcast.id,
                        stage: 'broadcast_processing',
                    })
                }
            }
        } catch (error) {
            console.error('Error in broadcast worker:', error)
            handleError(error as Error, 'critical', {
                stage: 'broadcast_worker_main',
            })
        }
    }
}
