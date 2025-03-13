export interface Agent {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'agent'
    avatar_url?: string
    status: 'active' | 'inactive'
    created_at: string
    last_seen_at?: string
    metadata?: {
        phone?: string
        department?: string
        skills?: string[]
        languages?: string[]
    }
}

export interface Session {
    agent: Agent
    access_token: string
    expires_at: number
}
