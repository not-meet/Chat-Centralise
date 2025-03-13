import { supabase } from './lib/supabase-server'
import { WhatsAppService } from './services/whatsapp.service'

async function testBroadcast() {
    try {
        // Create a broadcast
        const { data: broadcast } = await supabase
            .from('broadcasts')
            .insert({
                admin_id: 'b0eff191-1c7f-4e8c-aa5a-f3524e79afdf',
                message_content:
                    'Test broadcast message from Node 🚀\nPlease reply if you receive this!',
                message_type: 'text',
                status: 'pending',
                target_type: 'all',
                sent_count: 0,
                failed_count: 0,
            })
            .select()
            .single()

        console.log('Broadcast created:', broadcast)

        // Get active conversations
        const { data: conversations } = await supabase
            .from('conversations')
            .select(
                `
        contact_id,
        contacts (
          phone
        )
      `
            )
            .eq('status', 'active')

        console.log('Found conversations:', conversations)

        if (!conversations?.length) {
            console.log('No active conversations found')
            return
        }

        // Create recipients
        const recipientRecords = conversations.map((conv) => ({
            broadcast_id: broadcast.id,
            phone_number: conv.contacts.phone.startsWith('+')
                ? conv.contacts.phone
                : `+${conv.contacts.phone}`,
            status: 'pending',
            created_at: new Date().toISOString(),
        }))

        console.log('Creating recipients:', recipientRecords)

        const { error: recipientError } = await supabase
            .from('broadcast_recipients')
            .insert(recipientRecords)

        if (recipientError) {
            console.error('Error creating recipients:', recipientError)
            return
        }

        console.log('Recipients created successfully')

        // Send messages to each recipient
        for (const recipient of recipientRecords) {
            try {
                await WhatsAppService.sendMessage(
                    recipient.phone_number,
                    broadcast.message_content
                )
                console.log('Message sent to:', recipient.phone_number)

                // Update recipient status
                await supabase
                    .from('broadcast_recipients')
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                    })
                    .eq('broadcast_id', broadcast.id)
                    .eq('phone_number', recipient.phone_number)
            } catch (error) {
                console.error(
                    'Failed to send to:',
                    recipient.phone_number,
                    error
                )

                // Update recipient status
                await supabase
                    .from('broadcast_recipients')
                    .update({
                        status: 'failed',
                        error_message: error.message,
                    })
                    .eq('broadcast_id', broadcast.id)
                    .eq('phone_number', recipient.phone_number)
            }
        }

        console.log('Broadcast processing completed')
    } catch (error) {
        console.error('Error in broadcast test:', error)
    }
}

testBroadcast()
