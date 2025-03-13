import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth.context'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { agent, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!agent) {
        return <Navigate to="/login" />
    }

    return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
    const { agent, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!agent || agent.role !== 'admin') {
        return <Navigate to="/" />
    }

    return <>{children}</>
}
