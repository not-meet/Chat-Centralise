import { supabase } from '@/lib/supabase-browser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Agent, AgentStats, WorkloadMetrics } from '@/types/agent'

const API_URL = import.meta.env.VITE_API_URL

export class AgentService {
    // Get all agents with their stats
    static async getAgentsWithStats() {
        const { data: agents, error: agentsError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('role', 'agent')

        if (agentsError) throw agentsError

        const { data: stats, error: statsError } = await supabaseAdmin
            .from('agent_stats')
            .select('*')

        if (statsError) throw statsError

        return agents.map((agent) => ({
            ...agent,
            stats: stats?.find((s) => s.agent_id === agent.id) || {
                agent_id: agent.id,
                active_chats: 0,
                resolved_today: 0,
                avg_response_time: 0,
                satisfaction_rate: 0,
                last_updated: new Date().toISOString(),
            },
        }))
    }

    // Invite new agent
    static async inviteAgent(email: string, fullName: string) {
        try {
            // First check if user exists in auth
            const {
                data: { users },
                error: listError,
            } = await supabaseAdmin.auth.admin.listUsers()
            const existingUser = users.find((u) => u.email === email)

            if (existingUser) {
                // Check if user is already an agent
                const { data: userData } = await supabaseAdmin
                    .from('users')
                    .select('role')
                    .eq('id', existingUser.id)
                    .single()

                if (userData?.role === 'agent') {
                    throw new Error(
                        'This email is already registered as an agent'
                    )
                }
                // If user exists but not as agent, just update their role
                const { error: updateError } = await supabaseAdmin
                    .from('users')
                    .update({
                        role: 'agent',
                        full_name: fullName,
                    })
                    .eq('id', existingUser.id)

                if (updateError) throw updateError
                return existingUser
            }

            // Create new user if they don't exist
            const {
                data: { user },
                error: createError,
            } = await supabaseAdmin.auth.admin.createUser({
                email,
                email_confirm: false,
                user_metadata: {
                    full_name: fullName,
                    role: 'agent',
                    status: 'pending',
                },
            })

            if (createError) throw createError
            if (!user) throw new Error('Failed to create user')

            // Also create entry in users table
            const { error: insertError } = await supabaseAdmin
                .from('users')
                .insert([
                    {
                        id: user.id,
                        email: user.email,
                        full_name: fullName,
                        role: 'agent',
                        status: 'pending',
                    },
                ])

            if (insertError) {
                console.error('Failed to create user record:', insertError)
                // Try to clean up the auth user
                await supabaseAdmin.auth.admin.deleteUser(user.id)
                throw new Error('Failed to create user record')
            }

            // Send invitation via backend
            const response = await fetch(`${API_URL}/agents/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    fullName,
                    userId: user.id,
                }),
            })

            if (!response.ok) {
                // Clean up if email sending fails
                await supabaseAdmin.auth.admin.deleteUser(user.id)
                throw new Error('Failed to send invitation email')
            }

            return user
        } catch (error) {
            console.error('Invite agent error:', error)
            throw error
        }
    }

    // Update agent status
    static async updateAgentStatus(
        agentId: string,
        status: 'active' | 'inactive'
    ) {
        const { error } = await supabaseAdmin
            .from('users')
            .update({ status })
            .eq('id', agentId)
            .eq('role', 'agent')

        if (error) throw error
    }

    // Delete agent
    static async deleteAgent(agentId: string) {
        try {
            // First delete from users table
            const { error: deleteError } = await supabaseAdmin
                .from('users')
                .delete()
                .eq('id', agentId)

            if (deleteError) throw deleteError

            // Then delete from auth
            const { error } = await supabaseAdmin.auth.admin.deleteUser(agentId)
            if (error) throw error
        } catch (error) {
            console.error('Error deleting agent:', error)
            throw error
        }
    }

    // Get workload metrics
    static async getWorkloadMetrics(): Promise<WorkloadMetrics> {
        const { data: agents } = await supabaseAdmin
            .from('users')
            .select('id, status')
            .eq('role', 'agent')
            .eq('status', 'active')

        const { data: stats } = await supabaseAdmin
            .from('agent_stats')
            .select('agent_id, active_chats')

        const totalAgents = agents?.length || 0
        const totalActiveChats =
            stats?.reduce((sum, stat) => sum + (stat.active_chats || 0), 0) || 0

        return {
            total_agents: totalAgents,
            total_active_chats: totalActiveChats,
            avg_response_time: 0, // This will be calculated from conversations
            satisfaction_rate: 0, // This will be calculated from feedback
        }
    }
}
