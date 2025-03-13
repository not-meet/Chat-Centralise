import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { Conversation } from '@/types/chat'

export interface ConversationWithContact extends Conversation {
    contacts: {
        full_name: string | null
        phone: string
        avatar_url: string | null
    }
    messages: {
        content: string
        created_at: string
        status: string
    }[]
}

export function useConversations() {
    const [conversations, setConversations] = useState<
        ConversationWithContact[]
    >([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        // Initial fetch of conversations
        async function fetchConversations() {
            try {
                const { data, error } = await supabase
                    .from('conversations')
                    .select(
                        `
            *,
            contacts (
              full_name,
              phone,
              avatar_url
            ),
            messages (
              content,
              created_at,
              status
            )
          `
                    )
                    .order('last_message_at', { ascending: false })
                    .limit(1, { foreignTable: 'messages' }) // Get only the latest message

                if (error) throw error
                setConversations(data || [])
            } catch (err) {
                console.error('Error fetching conversations:', err)
                setError(err as Error)
            } finally {
                setLoading(false)
            }
        }

        // Subscribe to changes
        const subscription = supabase
            .channel('conversations')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conversations',
                },
                async (payload) => {
                    console.log('Conversation change received:', payload)

                    // Fetch the updated conversation with its relations
                    if (
                        payload.eventType === 'INSERT' ||
                        payload.eventType === 'UPDATE'
                    ) {
                        const { data, error } = await supabase
                            .from('conversations')
                            .select(
                                `
                *,
                contacts (
                  full_name,
                  phone,
                  avatar_url
                ),
                messages (
                  content,
                  created_at,
                  status
                )
              `
                            )
                            .eq('id', payload.new.id)
                            .limit(1, { foreignTable: 'messages' })
                            .single()

                        if (!error && data) {
                            setConversations((prev) => {
                                const index = prev.findIndex(
                                    (conv) => conv.id === data.id
                                )
                                if (index >= 0) {
                                    const updated = [...prev]
                                    updated[index] = data
                                    return updated
                                }
                                return [data, ...prev]
                            })
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setConversations((prev) =>
                            prev.filter((conv) => conv.id !== payload.old.id)
                        )
                    }
                }
            )
            .subscribe()

        // Fetch initial data
        fetchConversations()

        // Cleanup subscription
        return () => {
            subscription.unsubscribe()
        }
    }, [])

    return { conversations, loading, error }
}
