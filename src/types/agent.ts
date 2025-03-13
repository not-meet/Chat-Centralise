export interface Agent {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'agent'
    status: 'active' | 'inactive'
    created_at: string
    avatar_url?: string
}

export interface AgentStats {
    agent_id: string
    active_chats: number
    resolved_today: number
    avg_response_time: number
    satisfaction_rate: number
    last_updated: string
}

export interface WorkloadMetrics {
    total_agents: number
    total_active_chats: number
    avg_response_time: number
    satisfaction_rate: number
}

export interface AgentWithStats extends Agent {
    stats: AgentStats
}
