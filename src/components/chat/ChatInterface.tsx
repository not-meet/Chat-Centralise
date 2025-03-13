import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Image as ImageIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AgentMessageService } from '@/services/agent-messages'
import { useAuth } from '@/contexts/auth.context'
import { supabase } from '@/lib/supabase-browser'
import { formatDistanceToNow } from 'date-fns'
import { ConversationLabels } from './ConversationLabels'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

interface Contact {
    id: string
    full_name: string | null
    phone: string
    metadata: {
        profile_name?: string
        [key: string]: unknown
    }
    assigned_agent_id: string
}

interface Message {
    id: string
    conversation_id: string
    content: string
    sender_type: 'agent' | 'customer'
    sender_id: string
    created_at: string
    status: 'sent' | 'delivered' | 'read' | 'failed'
    message_type: string
    media_url: string
}

interface ChatInterfaceProps {
    chatId: string
    onLabelsChange?: () => void
}

interface Conversation {
    id: string
    contact_id: string
    contact: Contact
}

// Form schema for image upload
const imageUploadSchema = z.object({
    image: z.any().refine((file) => file instanceof File, {
        message: 'Please upload an image file',
    }),
    caption: z.string().min(1, 'Caption is required'),
})

type ImageUploadFormValues = z.infer<typeof imageUploadSchema>

function getDisplayName(contact: Contact | null): string {
    if (!contact) return 'Unknown Contact'
    return contact.metadata.profile_name || contact.full_name || contact.phone
}

async function uploadImage(file: File) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `chat-centralize-storage/chat-images/${fileName}`
    const { error: uploadError } = await supabase.storage
        .from('chat-centralize-storage')
        .upload(filePath, file)
    console.log('Upload error:', uploadError)
    if (uploadError) throw uploadError
    const {
        data: { publicUrl },
    } = supabase.storage.from('chat-centralize-storage').getPublicUrl(filePath)
    return publicUrl
}

export default function ChatInterface({
    chatId,
    onLabelsChange,
}: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [contact, setContact] = useState<Contact | null>(null)
    const [imageDialogOpen, setImageDialogOpen] = useState(false)
    const [imageUploading, setImageUploading] = useState(false)
    const { agent } = useAuth()
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Initialize form for image upload
    const imageUploadForm = useForm<ImageUploadFormValues>({
        resolver: zodResolver(imageUploadSchema),
        defaultValues: {
            caption: '',
        },
    })

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        if (!chatId) return

        async function fetchConversationAndMessages() {
            try {
                setLoading(true)

                // Fetch conversation details
                const { data: conversationData, error: conversationError } =
                    await supabase
                        .from('conversations')
                        .select(
                            `
            id,
            contact_id,
            metadata,
assigned_agent_id
          `
                        )
                        .eq('id', chatId)
                        .single()

                if (conversationError) throw conversationError

                // Create contact object from conversation metadata
                const contact: Contact = {
                    id: conversationData.contact_id,
                    full_name: conversationData.metadata?.profile_name || null,
                    phone: conversationData.metadata?.phone || '',
                    metadata: conversationData.metadata || {},
                    assigned_agent_id: conversationData.assigned_agent_id,
                }

                setContact(contact)

                // Fetch messages
                const { data: messagesData, error: messagesError } =
                    await supabase
                        .from('messages')
                        .select('*')
                        .eq('conversation_id', chatId)
                        .order('created_at', { ascending: true })

                if (messagesError) throw messagesError
                setMessages(messagesData as Message[])

                // Subscribe to new messages
                const subscription = supabase
                    .channel('messages')
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'messages',
                            filter: `conversation_id=eq.${chatId}`,
                        },
                        (payload) => {
                            if (payload.eventType === 'INSERT') {
                                setMessages((prev) => [
                                    ...prev,
                                    payload.new as Message,
                                ])
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

                return () => {
                    subscription.unsubscribe()
                }
            } catch (err) {
                console.error('Error fetching conversation data:', err)
                setError(err as Error)
            } finally {
                setLoading(false)
            }
        }

        fetchConversationAndMessages()
    }, [chatId])

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !agent || !contact) return

        if (contact.assigned_agent_id === null) {
            const { error } = await supabase.rpc('assign_conversation', {
                conversation_id: chatId,
                agent_id: agent.id,
            })
        }

        try {
            setIsSending(true)
            await AgentMessageService.sendMessage(
                chatId,
                contact.phone,
                newMessage,
                agent.id,
                contact.metadata.phoneId as string
            )
            setNewMessage('')
        } catch (err) {
            console.error('Error sending message:', err)
            setError(err as Error)
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const handleSendImage = async (data: ImageUploadFormValues) => {
        if (!agent || !contact) return

        try {
            setImageUploading(true)

            const mediaUrl = await uploadImage(data.image as File)
            const content = data.caption

            await AgentMessageService.sendMessage(
                chatId,
                contact.phone,
                content,
                agent.id,
                contact.metadata.phoneId as string,
                mediaUrl
            )

            setImageDialogOpen(false)
            imageUploadForm.reset()
        } catch (err) {
            console.error('Error sending image message:', err)
            setError(err as Error)
        } finally {
            setImageUploading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center text-destructive">
                Error loading chat
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col">
            {/* Chat Header */}
            <div className="border-b p-4 space-y-2">
                <h2 className="font-semibold">{getDisplayName(contact)}</h2>
                <ConversationLabels
                    conversationId={chatId}
                    onLabelsChange={onLabelsChange}
                />
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${
                                message.sender_type === 'agent'
                                    ? 'justify-end'
                                    : 'justify-start'
                            }`}
                        >
                            <div
                                className={`rounded-lg px-4 py-2 max-w-[70%] ${
                                    message.sender_type === 'agent'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                }`}
                            >
                                {message.message_type === 'image' ? (
                                    <div className="space-y-2">
                                        <img
                                            src={message.media_url}
                                            alt="Image message"
                                            className="w-full max-h-60 object-contain rounded-lg shadow-md"
                                        />
                                        {message.content && (
                                            <p className="break-words mt-2">
                                                {message.content}
                                            </p>
                                        )}
                                    </div>
                                ) : message.message_type === 'text' ? (
                                    <p className="break-words">
                                        {message.content}
                                    </p>
                                ) : (
                                    <p className="break-words">
                                        Sent Content : {message.message_type}
                                    </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs opacity-70">
                                        {formatDistanceToNow(
                                            new Date(message.created_at),
                                            {
                                                addSuffix: true,
                                            }
                                        )}
                                    </span>
                                    {message.sender_type === 'agent' && (
                                        <span className="text-xs opacity-70">
                                            {message.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="flex gap-2 p-4 border-t">
                <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="resize-none"
                    disabled={isSending}
                />
                <div className="flex flex-col gap-2">
                    <Button
                        onClick={handleSendMessage}
                        size="icon"
                        disabled={isSending}
                        className="px-8 min-w-[80px]"
                    >
                        {isSending ? (
                            <span>Sending...</span>
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        onClick={() => setImageDialogOpen(true)}
                        size="icon"
                        variant="outline"
                        disabled={isSending}
                        className="px-8 min-w-[80px]"
                    >
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Image Upload Dialog */}
            <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Send Image</DialogTitle>
                    </DialogHeader>
                    <Form {...imageUploadForm}>
                        <form
                            onSubmit={imageUploadForm.handleSubmit(
                                handleSendImage
                            )}
                            className="space-y-4"
                        >
                            <FormField
                                control={imageUploadForm.control}
                                name="image"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Image</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.files?.[0]
                                                    )
                                                }
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={imageUploadForm.control}
                                name="caption"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Caption</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Add a caption to your image..."
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setImageDialogOpen(false)}
                                    disabled={imageUploading}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={imageUploading}>
                                    {imageUploading
                                        ? 'Sending...'
                                        : 'Send Image'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

