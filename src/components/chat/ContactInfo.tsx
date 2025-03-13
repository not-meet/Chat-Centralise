import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { useAuth } from '@/contexts/auth.context'

interface Contact {
    id: string
    full_name: string | null
    phone: string
    metadata: {
        profile_name?: string
        [key: string]: unknown
    }
}

interface Note {
    id: string
    conversation_id: string
    content: string
    created_at: string
    created_by: string
    updated_at: string | null
}

interface ContactInfoProps {
    contact: Contact | null
}

interface ContactDetails {
    id: string
    full_name: string | null
    phone: string
    email: string | null
    location: string | null
    avatar_url: string | null
    created_at: string
    metadata?: {
        [key: string]: string | number | boolean | null
    }
    tags?: string[]
}

export function ContactInfo({ contact }: ContactInfoProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [notes, setNotes] = useState<Note[]>([])
    const [newNote, setNewNote] = useState('')
    const [conversationId, setConversationId] = useState<string | null>(null)
    const { agent } = useAuth()

    useEffect(() => {
        if (!contact?.id) {
            setNotes([])
            setConversationId(null)
            return
        }

        async function fetchNotes() {
            setLoading(true)
            setError(null)

            try {
                // First get the conversation ID for this contact
                const { data: conversationData, error: conversationError } =
                    await supabase
                        .from('conversations')
                        .select('id')
                        .eq('contact_id', contact.id)
                        .single()

                if (conversationError) throw conversationError
                if (!conversationData) return

                setConversationId(conversationData.id)

                // Then fetch notes for this conversation
                const { data: notesData, error: notesError } = await supabase
                    .from('notes')
                    .select(
                        'id, conversation_id, content, created_at, created_by, updated_at'
                    )
                    .eq('conversation_id', conversationData.id)
                    .order('created_at', { ascending: false })

                if (notesError) throw notesError
                setNotes(notesData || [])
            } catch (err) {
                console.error('Error fetching notes:', err)
                setError(err as Error)
            } finally {
                setLoading(false)
            }
        }

        fetchNotes()
    }, [contact?.id])

    const handleAddNote = async () => {
        if (!newNote.trim() || !conversationId || !agent) return

        try {
            const { error } = await supabase.from('notes').insert([
                {
                    conversation_id: conversationId,
                    content: newNote.trim(),
                    created_by: agent.id,
                },
            ])

            if (error) throw error

            // Refresh notes
            const { data: notesData, error: notesError } = await supabase
                .from('notes')
                .select(
                    'id, conversation_id, content, created_at, created_by, updated_at'
                )
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })

            if (notesError) throw notesError
            setNotes(notesData || [])
            setNewNote('')
        } catch (err) {
            console.error('Error adding note:', err)
            setError(err as Error)
        }
    }

    if (!contact) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                Select a conversation to view contact details
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col">
            <div className="border-b p-4">
                <h2 className="font-semibold">Contact Info</h2>
            </div>

            <ScrollArea className="flex-1">
                <div className="space-y-6 p-4">
                    {/* Contact Details */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">Details</h3>
                        <div className="rounded-lg border p-3 space-y-2">
                            <div>
                                <span className="text-sm text-muted-foreground">
                                    Name:
                                </span>
                                <p className="text-sm">
                                    {contact.metadata.profile_name ||
                                        contact.full_name ||
                                        'Unknown'}
                                </p>
                            </div>
                            <div>
                                <span className="text-sm text-muted-foreground">
                                    Phone:
                                </span>
                                <p className="text-sm">{contact.phone}</p>
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Notes</h3>
                            <span className="text-xs text-muted-foreground">
                                Internal notes visible only to agents
                            </span>
                        </div>

                        {/* Add Note */}
                        <div className="space-y-2">
                            <Textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Add a note about this contact..."
                                className="min-h-[100px]"
                            />
                            <Button
                                onClick={handleAddNote}
                                disabled={!newNote.trim() || !conversationId}
                                className="w-full"
                            >
                                Add Note
                            </Button>
                        </div>

                        {/* Notes List */}
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                        ) : error ? (
                            <div className="text-sm text-destructive p-2">
                                Error loading notes
                            </div>
                        ) : notes.length > 0 ? (
                            <div className="space-y-2">
                                {notes.map((note) => (
                                    <div
                                        key={note.id}
                                        className="rounded-lg border p-3"
                                    >
                                        <p className="text-sm">
                                            {note.content}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatDistanceToNow(
                                                new Date(note.created_at),
                                                {
                                                    addSuffix: true,
                                                }
                                            )}
                                            {note.updated_at && ' (edited)'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground p-2">
                                No notes yet
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}
