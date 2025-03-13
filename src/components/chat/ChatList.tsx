import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Search, AlertCircle, Tag, X, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/contexts/auth.context'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { ReassignDialog } from './ReassignDialog'
import { cn } from '@/lib/utils'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface ChatListProps {
    onSelectChat: (chatId: string) => void
    selectedChatId?: string
}

interface Contact {
    full_name: string | null
    phone: string
    avatar_url: string | null
    metadata?: {
        profile_name?: string
        [key: string]: unknown
    }
}

interface LastMessage {
    content: string
    created_at: string
}

interface ConversationPayload {
    id: string
    assigned_agent_id: string | null
    status: string
    last_message_at: string
    metadata: Record<string, unknown>
}

type RealtimePayload = RealtimePostgresChangesPayload<ConversationPayload> & {
    new: ConversationPayload
}

interface Label {
    id: string
    name: string
    color: string
    is_active: boolean
}

interface Conversation {
    id: string
    contact_id: string
    assigned_agent_id: string | null
    status: 'unassigned' | 'active' | 'archived' | 'pending' | 'needs-response'
    priority: 'low' | 'normal' | 'high' | 'urgent'
    last_message_at: string
    needs_attention: boolean
    last_customer_message_at: string | null
    last_agent_response_at: string | null
    contact: Contact
    last_message: LastMessage | null
    labels?: Label[]
    metadata?: {
        profile_name?: string
        phone?: string
        assignment_history?: Array<{
            agent_id: string
            assigned_at: string
            assigned_by?: string
        }>
    }
    assigned_agent?: {
        full_name: string
    }
}

export function ChatList({ onSelectChat, selectedChatId }: ChatListProps) {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedLabel, setSelectedLabel] = useState<string>('all')
    const [filterType, setFilterType] = useState<string>('all')
    const [availableLabels, setAvailableLabels] = useState<Label[]>([])
    const { agent } = useAuth()
    const [userData, setUserData] = useState<{
        role: string
        status: string
    } | null>(null)
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const isInitialLoadRef = useRef(true)
    const prevSelectedLabelRef = useRef(selectedLabel)
    const prevFilterTypeRef = useRef(filterType)

    // Add function to fetch available labels
    useEffect(() => {
        async function fetchLabels() {
            try {
                const { data, error } = await supabase
                    .from('labels')
                    .select('*')
                    .eq('is_active', true)

                if (error) throw error
                setAvailableLabels(data || [])
            } catch (error) {
                console.error('Error fetching labels:', error)
            }
        }

        fetchLabels()
    }, [])
    //function to update profile name and labels in real time
    async function transformConversationData(rawData) {
        // Fetch the latest message
        const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', rawData.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        // Fetch the labels
        const { data: labelsData } = await supabase
            .from('conversation_labels')
            .select('label:labels(*)')
            .eq('conversation_id', rawData.id)

        // Transform the data with consistent structure
        return {
            ...rawData,
            contact: {
                ...(rawData.contact || {}),
                full_name: null,
                phone: rawData.metadata?.phone || 'Unknown',
                avatar_url: null,
                metadata: {
                    profile_name: rawData.metadata?.profile_name,
                },
            },
            last_message: messages || null,
            labels: labelsData ? labelsData.map((item) => item.label) : [],
        }
    }

    // Main fetch function with isPolling parameter to control loading state
    async function fetchConversations(isPolling = false) {
        try {
            // Only set loading to true if this is not a polling refresh
            if (!isPolling) {
                setLoading(true)
            }

            // Debug auth context
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser()
            const {
                data: { session },
            } = await supabase.auth.getSession()
            console.log('Detailed auth:', {
                user,
                session,
                metadata: user?.app_metadata,
                jwt: session?.access_token,
                decodedJwt: session
                    ? JSON.parse(atob(session.access_token.split('.')[1]))
                    : null,
            })

            // First verify if the agent can access conversations
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role, status')
                .eq('id', agent.id)
                .single()

            setUserData(userData)

            console.log('Current user data:', userData) // Debug user role

            if (userError) throw userError
            if (!userData || userData.status !== 'active')
                throw new Error('User is not active')

            // First, get all conversations to debug
            const { data: allConvs, error: countError } = await supabase
                .from('conversations')
                .select('*')

            console.log('All conversations before filtering:', {
                count: allConvs?.length || 0,
                conversations: allConvs,
                error: countError,
            })

            // Build query based on role
            const query = supabase
                .from('conversations')
                .select(
                    `
               *,
               contact:contacts (*),
               assigned_agent:users!conversations_assigned_agent_id_fkey (
            id,
            full_name,
            email
               ),
               labels:conversation_labels(
            label:labels(*)
               )
             `
                )
                .not('status', 'eq', 'archived')

            const { data, error } = await query.order('last_message_at', {
                ascending: false,
            })

            console.log(
                'Raw conversation data:',
                data?.map((row) => ({
                    id: row.id,
                    metadata: row.metadata,
                    contact: row.contact,
                }))
            )

            if (error) throw error

            // Transform the data
            const transformedData = data.map((row) => ({
                ...row,
                contact: {
                    ...(row.contact || {}),
                    full_name: null,
                    phone: row.metadata?.phone || 'Unknown',
                    avatar_url: null,
                    metadata: {
                        profile_name: row.metadata?.profile_name,
                    },
                },
                last_message: null,
                labels: row.labels?.map((l) => l.label) || [],
            }))

            console.log(
                'Contact data check:',
                transformedData.map((conv) => ({
                    id: conv.id,
                    contact: {
                        metadata: conv.contact?.metadata,
                        profile_name: conv.contact?.metadata?.profile_name,
                        first_letter: conv.contact?.metadata?.profile_name?.[0],
                        full_name: conv.contact?.full_name,
                        phone: conv.contact?.phone,
                    },
                }))
            )

            console.log('Transformed data:', transformedData) // Debug transformed data

            // Fetch last message for each conversation
            const conversationsWithMessages = await Promise.all(
                transformedData.map(async (conv) => {
                    const { data: messages } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('conversation_id', conv.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single()

                    return {
                        ...conv,
                        last_message: messages || null,
                    }
                })
            )

            console.log(
                'Final conversations with messages:',
                conversationsWithMessages
            ) // Debug final data
            setConversations(conversationsWithMessages)
        } catch (err) {
            console.error('Error fetching conversations:', err)
            setError(err as Error)
        } finally {
            // Only update loading state if this is not a polling refresh
            if (!isPolling) {
                setLoading(false)
            }
        }
    }

    // Effect for filter changes
    useEffect(() => {
        // Skip on initial render
        if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
            return;
        }
        
        // Check if either filter has changed
        if (
            selectedLabel !== prevSelectedLabelRef.current || 
            filterType !== prevFilterTypeRef.current
        ) {
            console.log('Filter changed, refreshing conversations');
            // Refresh the data without showing loading indicator
            fetchConversations(true);
            
            // Update the refs to current values
            prevSelectedLabelRef.current = selectedLabel;
            prevFilterTypeRef.current = filterType;
        }
    }, [selectedLabel, filterType]);

    useEffect(() => {
        if (!agent) return

        // Initial fetch (with loading indicator)
        fetchConversations(false)
        isInitialLoadRef.current = false;
        
        // Store initial filter values in refs
        prevSelectedLabelRef.current = selectedLabel;
        prevFilterTypeRef.current = filterType;
        
        refreshIntervalRef.current = setInterval(() => {
            console.log('Auto-refreshing conversations (60-second interval)')
            fetchConversations(true)
        }, 60000)

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('public:conversations_and_labels')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conversations',
                    ...(userData?.role !== 'admin'
                        ? { filter: `assigned_agent_id=eq.${agent.id}` }
                        : {}),
                },
                async (payload: RealtimePayload) => {
                    if (!payload.new?.id) return

                    const { data: updatedData } = await supabase
                        .from('conversations')
                        .select(
                            `
              *,
              contact:contacts (*),
              messages (
                content,
                created_at
              )
            `
                        )
                        .eq('id', payload.new.id)
                        .limit(1, { foreignTable: 'messages' })
                        .single()

                    if (updatedData) {
                        const transformedConversation =
                            await transformConversationData(updatedData)
                        setConversations((prev) => {
                            const index = prev.findIndex(
                                (c) => c.id === updatedData.id
                            )
                            if (index >= 0) {
                                const updated = [...prev]
                                updated[index] = transformedConversation
                                return updated
                            }
                            return [transformedConversation, ...prev]
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            // Clean up interval and subscription when component unmounts
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current)
            }
            subscription.unsubscribe()
        }
    }, [agent])

    const getStatusBadge = (conversation: Conversation) => {
        const variants: Record<string, string> = {
            unassigned: 'bg-gray-500',
            active: 'bg-green-500',
            'needs-response': 'bg-yellow-500',
            pending: 'bg-blue-500',
            archived: 'bg-slate-500',
        }

        return (
            <Badge className={`${variants[conversation.status]} text-white`}>
                {conversation.status}
            </Badge>
        )
    }

    const filteredConversations = conversations
        .filter((conversation) => {
            const searchTerm = searchQuery.toLowerCase()
            const contactName =
                conversation.contact?.full_name?.toLowerCase() || ''
            const contactPhone =
                conversation.contact?.phone?.toLowerCase() || ''
            const lastMessage =
                conversation.last_message?.content?.toLowerCase() || ''

            // Update label filtering logic
            const matchesLabel =
                selectedLabel === 'all' ||
                conversation.labels?.some((label) => label.id === selectedLabel)

            const matchesFilterType =
                filterType === 'all' ||
                (filterType === 'assigned' && conversation.assigned_agent_id) ||
                (filterType === 'unassigned' && !conversation.assigned_agent_id)

            return (
                (contactName.includes(searchTerm) ||
                    contactPhone.includes(searchTerm) ||
                    lastMessage.includes(searchTerm)) &&
                matchesLabel &&
                matchesFilterType
            )
        })
        .sort((a, b) => {
            // Sort by needs_attention first, then by last_message_at
            if (a.needs_attention !== b.needs_attention) {
                return a.needs_attention ? -1 : 1
            }
            return (
                new Date(b.last_message_at).getTime() -
                new Date(a.last_message_at).getTime()
            )
        })

    console.log(filteredConversations, 'filter')
    // Split conversations into assigned and unassigned
    const assignedConversations = filteredConversations.filter(
        (conv) =>
            conv.assigned_agent_id === agent.id || userData?.role === 'admin'
    )

    const unassignedConversations = filteredConversations.filter(
        (conv) => !conv.assigned_agent_id && conv.status === 'unassigned'
    )

    const renderConversationActions = (conversation: Conversation) => {
        if (userData?.role !== 'admin') return null

        return (
            <div className="flex items-center gap-2">
                <ReassignDialog
                    conversationId={conversation.id}
                    currentAgentId={conversation.assigned_agent_id}
                    onReassigned={() => fetchConversations(false)}
                />
            </div>
        )
    }

    // Function to handle label filter change
    const handleLabelChange = (value) => {
        setSelectedLabel(value);
    };

    // Function to handle filter type change
    const handleFilterTypeChange = (value) => {
        setFilterType(value);
    };

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
                Error loading conversations
            </div>
        )
    }
    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b space-y-4">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search conversations..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        value={selectedLabel}
                        onValueChange={handleLabelChange}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by label" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                <div className="flex items-center gap-2">
                                    <Tag className="h-3 w-3" />
                                    All labels
                                </div>
                            </SelectItem>
                            {availableLabels.map((label) => (
                                <SelectItem key={label.id} value={label.id}>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{
                                                backgroundColor: label.color,
                                            }}
                                        />
                                        {label.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedLabel !== 'all' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLabel('all')}
                            className="h-8 px-2"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                    <Select value={filterType} onValueChange={handleFilterTypeChange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter conversations" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                All conversations
                            </SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="unassigned">
                                Unassigned
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    {filterType !== 'all' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilterType('all')}
                            className="h-8 px-2"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="space-y-6 p-4">
                    {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <div className="text-4xl mb-4">📭</div>
                            <p className="text-center">
                                No conversations available
                            </p>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <div className="text-4xl mb-4">💬</div>
                            <p className="text-center">
                                No conversations match your filters
                            </p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => {
                                    setSearchQuery('')
                                    setSelectedLabel('all')
                                    setFilterType('all')
                                }}
                            >
                                Clear filters
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <h2 className="font-semibold text-sm text-muted-foreground mb-2 px-2">
                                Conversations ({filteredConversations.length})
                            </h2>
                            <div className="space-y-2">
                                {filteredConversations.map((conversation) => (
                                    <div
                                        key={conversation.id}
                                        className={cn(
                                            'flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors',
                                            selectedChatId ===
                                                conversation.id && 'bg-accent'
                                        )}
                                        onClick={() =>
                                            onSelectChat(conversation.id)
                                        }
                                    >
                                        <Avatar className="h-10 w-10 shrink-0">
                                            <div className="bg-primary/10 h-full w-full flex items-center justify-center">
                                                <User className="h-5 w-5 text-primary/80" />
                                            </div>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-medium truncate">
                                                    {conversation.contact
                                                        ?.metadata
                                                        ?.profile_name ||
                                                        conversation.contact
                                                            ?.phone ||
                                                        'Unknown'}
                                                </span>
                                                {conversation.needs_attention && (
                                                    <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                                                )}
                                                {getStatusBadge(conversation)}
                                                {conversation.assigned_agent && (
                                                    <div className="text-xs text-muted-foreground">
                                                        Assigned to:{' '}
                                                        {
                                                            conversation
                                                                .assigned_agent
                                                                .full_name
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                            {conversation.labels &&
                                                conversation.labels.length >
                                                    0 && (
                                                    <div className="flex flex-wrap gap-1 mb-1">
                                                        {conversation.labels
                                                            .filter(
                                                                (label) =>
                                                                    label.is_active
                                                            )
                                                            .map((label) => (
                                                                <Badge
                                                                    key={
                                                                        label.id
                                                                    }
                                                                    variant="secondary"
                                                                    className="text-xs"
                                                                    style={{
                                                                        backgroundColor:
                                                                            label.color,
                                                                        color: getContrastColor(
                                                                            label.color
                                                                        ),
                                                                    }}
                                                                >
                                                                    {label.name}
                                                                </Badge>
                                                            ))}
                                                    </div>
                                                )}
                                            {conversation.last_message && (
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        {
                                                            conversation
                                                                .last_message
                                                                .content
                                                        }
                                                    </p>
                                                    <span className="text-xs text-muted-foreground shrink-0">
                                                        {conversation.last_message_at &&
                                                            formatDistanceToNow(
                                                                new Date(
                                                                    conversation.last_message_at
                                                                ),
                                                                {
                                                                    addSuffix:
                                                                        true,
                                                                }
                                                            )}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {renderConversationActions(
                                            conversation
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

function getContrastColor(hexcolor: string) {
    // Convert hex to RGB
    const r = parseInt(hexcolor.slice(1, 3), 16)
    const g = parseInt(hexcolor.slice(3, 5), 16)
    const b = parseInt(hexcolor.slice(5, 7), 16)

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    return luminance > 0.5 ? '#000000' : '#ffffff'
}
