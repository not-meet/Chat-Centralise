import { supabase } from '@/lib/supabase-browser'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface Broadcast {
    id: string
    admin_id: string
    message_content: string
    message_type: 'text' | 'image' | 'template'
    media_url?: string
    template_id?: string
    created_at: string
    status: 'draft' | 'pending' | 'sent' | 'failed'
    target_type: 'all' | 'label' | 'selected' | 'numbers'
    target_label?: string
    target_numbers?: string[]
    sent_count: number
    failed_count: number
}

export interface CreateBroadcastDto {
    message_content: string
    message_type: 'text' | 'image' | 'template'
    media_url?: string
    template_id?: string
    target_type: 'all' | 'label' | 'numbers'
    target_label?: string
    target_numbers?: string[]
}

interface Contact {
    phone: string
    full_name: string | null
}

interface ConversationWithContact {
    contact_id: string
    contact: Contact
}

class BroadcastService {
    async createBroadcast(data: CreateBroadcastDto) {
        const { data: agent } = await supabase.auth.getUser()
        if (!agent.user) throw new Error('Not authenticated')

        const { data: broadcast, error } = await supabase
            .from('broadcasts')
            .insert({
                ...data,
                admin_id: agent.user.id,
                status: 'pending',
                sent_count: 0,
                failed_count: 0,
            })
            .select()
            .single()

        if (error) throw error
        return broadcast
    }

    async getBroadcasts() {
        const { data: broadcasts, error } = await supabase
            .from('broadcasts')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return broadcasts
    }

    async getBroadcast(id: string) {
        const { data: broadcast, error } = await supabase
            .from('broadcasts')
            .select('*, broadcast_recipients(*)')
            .eq('id', id)
            .single()

        if (error) throw error
        return broadcast
    }

    async uploadImage(file: File) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `chat-centralize-storage/broadcast-images/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('chat-centralize-storage')
            .upload(filePath, file)

        console.log('Upload error:', uploadError)
        if (uploadError) throw uploadError

        const {
            data: { publicUrl },
        } = supabase.storage
            .from('chat-centralize-storage')
            .getPublicUrl(filePath)

        return publicUrl
    }

    async getRecipientCount(targetType: 'all' | 'label', labelId?: string) {
        if (targetType === 'all') {
            const { count, error } = await supabase
                .from('conversations')
                .select(
                    `
          contact_id,
          contact:contacts (
            id
          )
        `,
                    { count: 'exact' }
                )
            // .eq('status', 'active')

            if (error) throw error
            return count || 0
        }

        if (targetType === 'label' && labelId) {
            console.log('Getting recipients for label:', labelId)

            // First verify the label exists and is active
            const { data: label, error: labelError } = await supabase
                .from('labels')
                .select('id, name, is_active')
                .eq('id', labelId)
                .single()

            if (labelError) {
                console.error('Error fetching label:', labelError)
                throw labelError
            }

            console.log('Found label:', label)

            if (!label || label.is_active === false) {
                console.log('Label not found or inactive')
                return 0
            }

            // First get conversation IDs with this label
            const { data: labeledConversations, error: labelError2 } =
                await supabase
                    .from('conversation_labels')
                    .select('conversation_id')
                    .eq('label_id', labelId)

            if (labelError2) {
                console.error(
                    'Error fetching labeled conversations:',
                    labelError2
                )
                throw labelError2
            }

            const conversationIds = labeledConversations.map(
                (c) => c.conversation_id
            )
            console.log(
                'Found labeled conversation IDs-------------:',
                conversationIds
            )

            if (conversationIds.length === 0) {
                return 0
            }

            // Get count of active conversations with contacts
            const { count, error: countError } = await supabase
                .from('conversations')
                .select(
                    `
          contact_id,
          contact:contacts (
            id
          )
        `,
                    { count: 'exact' }
                )
                // .eq('status', 'active')
                .in('id', conversationIds)

            if (countError) {
                console.error(
                    'Error counting labeled conversations:',
                    countError
                )
                throw countError
            }

            return count || 0
        }

        return 0
    }

    async getRecipientPreview(targetType: 'all' | 'label', labelId?: string) {
        interface Contact {
            phone: string
            full_name: string | null
        }

        interface ConversationWithContact {
            contact_id: string
            contact: Contact
            phoneId: string
        }

        if (targetType === 'all') {
            const { data, error } = await supabase
                .from('conversations')
                .select('*, contact:contacts(*)')
                .eq('status', 'active')
                .limit(5)

            if (error) {
                console.error('Error fetching all recipients:', error)
                throw error
            }

            console.log(
                'Found all recipients data:',
                JSON.stringify(data, null, 2)
            )

            return ((data || []) as unknown as ConversationWithContact[])
                .filter((row) => row.contact)
                .map((row) => ({
                    phone_number: row.contact.phone,
                    name: row.contact.full_name,
                }))
        }

        if (targetType === 'label' && labelId) {
            console.log('Getting recipient preview for label:', labelId)

            // First get conversation IDs with this label
            const { data: labeledConversations, error: labelError } =
                await supabase
                    .from('conversation_labels')
                    .select('conversation_id')
                    .eq('label_id', labelId)

            if (labelError) {
                console.error(
                    'Error fetching labeled conversations:',
                    labelError
                )
                throw labelError
            }

            const conversationIds = labeledConversations.map(
                (c) => c.conversation_id
            )

            if (conversationIds.length === 0) {
                return []
            }

            // Get the conversations with their contacts
            const { data, error } = await supabase
                .from('conversations')
                .select('*, contact:contacts(*)')
                .eq('status', 'active')
                .in('id', conversationIds)
                .limit(5)

            if (error) {
                console.error('Error fetching recipient preview:', error)
                throw error
            }

            console.log(
                'Found recipient preview data:',
                JSON.stringify(data, null, 2)
            )

            return ((data || []) as unknown as ConversationWithContact[])
                .filter((row) => row.contact)
                .map((row) => ({
                    phone_number: row.contact.phone,
                    name: row.contact.full_name,
                }))
        }

        return []
    }

    async sendBroadcast(broadcast: Broadcast) {
        console.log('Getting all active conversations with contacts...')

        let query = supabase.from('conversations').select(
            `
        *,
        contact:contacts (
          phone
        )
      `
        )
        // .eq('status', 'active')

        // If targeting specific numbers
        if (broadcast.target_type === 'numbers' && broadcast.target_numbers) {
            console.log(
                'Fetching conversations for specific numbers:',
                broadcast.target_numbers
            )
            query = query.in('contact.phone', broadcast.target_numbers)
        }

        // If targeting specific label
        if (broadcast.target_type === 'label' && broadcast.target_label) {
            console.log(
                'Fetching conversations for label:',
                broadcast.target_label
            )
            const { data: labeledConversations, error: labelError } =
                await supabase
                    .from('conversation_labels')
                    .select('conversation_id')
                    .eq('label_id', broadcast.target_label)

            if (labelError) {
                console.error(
                    'Error fetching labeled conversations:',
                    labelError
                )
                throw labelError
            }

            if (labeledConversations && labeledConversations.length > 0) {
                const conversationIds = labeledConversations.map(
                    (c) => c.conversation_id
                )
                query = query.in('id', conversationIds)
            } else {
                console.log(
                    'No conversations found for label:',
                    broadcast.target_label
                )
                throw new Error('No conversations found for the selected label')
            }
        }

        const { data: conversations, error } = await query

        if (error) {
            console.error('Error fetching conversations:', error)
            throw error
        }

        console.log(
            'Raw conversation data:',
            JSON.stringify(conversations, null, 2)
        )
        console.log('Broadcast:', broadcast)

        // Map conversations to recipients, prioritizing contact phone over metadata
        const recipients = (conversations || [])
            .filter(
                (conv) => conv.contact?.phone || conv.metadata?.original_phone
            )
            .map((conv) => ({
                broadcast_id: broadcast.id,
                phone_number:
                    conv.contact?.phone || conv.metadata?.original_phone,
                status: 'pending',
                created_at: new Date().toISOString(),
                phoneId: conv.metadata?.phoneId,
            }))

        console.log('Mapped recipients:', recipients)

        if (recipients.length === 0) {
            console.log(
                'No recipients found. Broadcast type:',
                broadcast.target_type
            )
            throw new Error('No valid phone numbers found for this broadcast')
        }

        // Remove duplicates based on phone number
        const uniqueRecipients = recipients.filter(
            (recipient, index, self) =>
                index ===
                self.findIndex((r) => r.phone_number === recipient.phone_number)
        )

        console.log('Unique recipients count:', uniqueRecipients.length)

        // Create recipients
        const { error: recipientError } = await supabase
            .from('broadcast_recipients')
            .insert(uniqueRecipients)

        if (recipientError) {
            console.error('Error creating recipients:', recipientError)
            throw recipientError
        }

        // Send the broadcast via API
        const response = await fetch(
            `${API_URL}/broadcasts/${broadcast.id}/send`,
            {
                method: 'POST',
            }
        )

        if (!response.ok) {
            throw new Error('Failed to send broadcast')
        }

        return {
            totalRecipients: recipients.length,
            ...(await response.json()),
        }
    }
}

interface RecipientPreview {
    phone: string
    name?: string
}

export const broadcastService = new BroadcastService()
