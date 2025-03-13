import { supabase } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import { Role } from '@/types/permissions'

export interface AuthUser extends User {
    role: Role
}

export class AuthService {
    static async signIn(email: string, password: string): Promise<AuthUser> {
        try {
            console.log('Attempting sign in for:', email)

            const { data, error: signInError } =
                await supabase.auth.signInWithPassword({
                    email,
                    password,
                })

            if (signInError) {
                console.error('Sign in error:', signInError)
                throw signInError
            }

            const user = data.user
            if (!user) {
                console.error('No user returned after sign in')
                throw new Error('No user returned after successful sign in')
            }

            // Get user role from users table using service role to bypass RLS
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()

            if (userError) {
                console.error('Error fetching user role:', userError)
                throw userError
            }

            if (!userData || !userData.role) {
                console.error('No role found for user')
                throw new Error('No role found for user')
            }

            return {
                ...user,
                role: userData.role as Role,
            }
        } catch (error) {
            console.error('Sign in process failed:', error)
            throw error
        }
    }

    static async signOut(): Promise<void> {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    }

    static async getCurrentUser(): Promise<AuthUser | null> {
        try {
            const {
                data: { user },
                error,
            } = await supabase.auth.getUser()

            if (error || !user) {
                return null
            }

            // Get user role
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()

            if (userError || !userData) {
                console.error('Error fetching user role:', userError)
                return null
            }

            return {
                ...user,
                role: userData.role as Role,
            }
        } catch (error) {
            console.error('Get current user error:', error)
            return null
        }
    }

    static onAuthStateChange(callback: (user: AuthUser | null) => void) {
        console.log('Setting up auth state change listener')
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(
                'Auth state changed:',
                event,
                session ? 'Session exists' : 'No session'
            )

            if (event === 'SIGNED_OUT' || !session?.user) {
                console.log('User is signed out or no session')
                callback(null)
                return
            }

            try {
                console.log('Fetching user role after auth state change')
                // Get user role from users table using email to avoid ID-based RLS
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('email', session.user.email)
                    .single()

                if (userError) {
                    console.error('Error fetching user role:', userError)
                    callback(null)
                    return
                }

                console.log(
                    'Role fetched after auth state change:',
                    userData?.role
                )
                callback({
                    ...session.user,
                    role: userData.role as Role,
                })
            } catch (error) {
                console.error('Error in auth state change:', error)
                callback(null)
            }
        })

        return {
            unsubscribe: () => {
                console.log('Unsubscribing from auth state changes')
                subscription.unsubscribe()
            },
        }
    }
}
