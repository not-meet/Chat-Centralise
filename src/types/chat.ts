export interface Message {
    id: string
    conversation_id: string
    content: string
    sender_type: 'agent' | 'contact'
    sender_id: string
    message_type: 'text' | 'image' | 'file'
    status: 'sent' | 'delivered' | 'read' | 'failed'
    media_url?: string | null
    metadata?: {
        twilio_message_sid?: string
        original_sender?: string
        profile_name?: string
    }
    created_at: string
    delivered_at?: string | null
    read_at?: string | null
    error_data?: {
        code?: string
        message?: string
        details?: Record<string, string>
    } | null
    reply_to_message_id?: string | null
}

export interface Conversation {
    id: string
    contact_id: string
    assigned_agent_id?: string | null
    status: 'unassigned' | 'active' | 'archived' | 'pending'
    last_message_at?: string | null
    created_at: string
    metadata?: {
        phone?: string
        original_phone?: string
        profile_name?: string
        assignment_history?: Array<{
            agent_id: string
            assigned_at: string
            assigned_by?: string
        }>
    }
    priority: 'low' | 'normal' | 'high' | 'urgent'
    last_agent_response_at?: string | null
    first_response_time?: string | null
    needs_attention: boolean
    last_customer_message_at?: string | null
}

export interface Contact {
    id: string
    phone: string
    wa_id?: string
    full_name?: string
    email?: string
    location?: string
    avatar_url?: string
    status: 'active' | 'blocked'
    last_contacted_at?: string
    created_at: string
    metadata?: {
        custom_fields?: Record<string, string>
        preferences?: Record<string, boolean>
        notes?: string
        source?: string
    }
    tags?: string[]
    language?: string
    timezone?: string
}
