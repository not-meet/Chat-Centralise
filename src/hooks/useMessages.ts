import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { Message } from '@/types/chat'

export function useMessages(conversationId: string) {
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        // Initial fetch of messages
        async function fetchMessages() {
            try {
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: true })

                if (error) throw error
                setMessages(data || [])
            } catch (err) {
                console.error('Error fetching messages:', err)
                setError(err as Error)
            } finally {
                setLoading(false)
            }
        }

        // Subscribe to new messages
        const subscription = supabase
            .channel(`messages:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    console.log('Real-time message update:', payload)
                    if (payload.eventType === 'INSERT') {
                        setMessages((prev) => [...prev, payload.new as Message])
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === payload.new.id
                                    ? { ...msg, ...payload.new }
                                    : msg
                            )
                        )
                    }
                }
            )
            .subscribe()

        // Fetch initial messages
        fetchMessages()

        // Cleanup subscription
        return () => {
            subscription.unsubscribe()
        }
    }, [conversationId])

    return { messages, loading, error }
}
