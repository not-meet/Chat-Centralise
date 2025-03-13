export interface Permissions {
    canChat: boolean
    canManageLabels: boolean
    canManageUsers: boolean
    canManageAgents: boolean
    canViewAnalytics: boolean
    canBroadcast: boolean
}

export type Role = 'admin' | 'agent'

export const ROLE_PERMISSIONS: Record<Role, Permissions> = {
    agent: {
        canChat: true,
        canManageLabels: false,
        canManageUsers: false,
        canManageAgents: false,
        canViewAnalytics: false,
        canBroadcast: true,
    },
    admin: {
        canChat: true,
        canManageLabels: true,
        canManageUsers: true,
        canManageAgents: true,
        canViewAnalytics: true,
        canBroadcast: true,
    },
}
