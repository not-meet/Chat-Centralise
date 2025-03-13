import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase-browser'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface Agent {
    id: string
    email: string
    full_name: string | null
    role: 'admin' | 'agent'
    status: 'active' | 'inactive'
}

interface AuthContextType {
    agent: Agent | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<void>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [agent, setAgent] = useState<Agent | null>(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        checkUser()
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchAgent(session.user.id)
            } else {
                setAgent(null)
                setLoading(false)
                navigate('/login')
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [navigate])

    async function checkUser() {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (session?.user) {
                await fetchAgent(session.user.id)
            } else {
                setLoading(false)
            }
        } catch (error) {
            console.error('Error checking user session:', error)
            setLoading(false)
        }
    }

    async function fetchAgent(userId: string) {
        try {
            // Get user data from users table using admin client
            const { data: userData, error: userError } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (userError || !userData) {
                console.error('Error fetching user data:', userError)
                setAgent(null)
                return null
            }

            // Create agent object from user data
            const agent: Agent = {
                id: userData.id,
                email: userData.email,
                full_name: userData.full_name || null,
                role: userData.role || 'agent',
                status: userData.status || 'active',
            }

            setAgent(agent)
        } catch (error) {
            console.error('Error fetching agent:', error)
            setAgent(null)
        } finally {
            setLoading(false)
        }
    }

    async function signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) throw error

        if (data.user) {
            const { data: userData, error: userError } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single()

            if (userError) throw userError
            if (!userData) throw new Error('User not found')

            if (userData.status === 'inactive') {
                await supabase.auth.signOut()
                throw new Error(
                    'Your account has been deactivated. Please contact support.'
                )
            }

            await fetchAgent(data.user.id)
        }
    }

    async function signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setAgent(null)
        navigate('/login')
    }

    const value = {
        agent,
        loading,
        signIn,
        signOut,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
