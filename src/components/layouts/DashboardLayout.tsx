import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    MessageSquare,
    Users,
    Tag,
    //Settings,
    Menu,
    LogOut,
    Megaphone,
    X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth.context'
import { useMediaQuery } from '@/hooks/use-media-query'

interface DashboardLayoutProps {
    children: React.ReactNode
}

const navigation = [
    {
        name: 'Chats',
        href: '/',
        icon: MessageSquare,
        adminOnly: false,
    },
    {
        name: 'Agents',
        href: '/agents',
        icon: Users,
        adminOnly: true,
    },
    {
        name: 'Broadcasts',
        href: '/broadcasts',
        icon: Megaphone,
        adminOnly: true,
    },
    {
        name: 'Labels',
        href: '/labels',
        icon: Tag,
        adminOnly: false,
    },
    //{
    // name: "Settings",
    // href: "/settings",
    // icon: Settings,
    // adminOnly: false
    //},
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const navigate = useNavigate()
    const location = useLocation()
    const { agent, signOut } = useAuth()
    const isMobile = useMediaQuery('(max-width: 768px)')

    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false)
        } else {
            setSidebarOpen(true)
        }
    }, [isMobile])

    const filteredNavigation = navigation.filter(
        (item) => !item.adminOnly || agent?.role === 'admin'
    )

    const handleSignOut = async () => {
        try {
            await signOut()
            navigate('/login')
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    return (
        <div className="flex h-screen relative">
            {/* Mobile Overlay */}
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={cn(
                    'bg-card border-r transition-all duration-300 z-50',
                    isMobile ? 'fixed h-full' : 'relative',
                    sidebarOpen ? 'w-64' : 'w-16',
                    !sidebarOpen && isMobile && 'hidden'
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Sidebar Header */}
                    <div className="flex h-16 items-center justify-between gap-2 border-b px-4">
                        {sidebarOpen && (
                            <span className="font-semibold">
                                ChatCentralize
                            </span>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            {sidebarOpen && isMobile ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 p-2">
                        {filteredNavigation.map((item) => {
                            const isActive = location.pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() =>
                                        isMobile && setSidebarOpen(false)
                                    }
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-accent'
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {sidebarOpen && <span>{item.name}</span>}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* User Profile */}
                    <div className="border-t p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                                {agent?.full_name?.charAt(0) || 'A'}
                            </div>
                            {sidebarOpen && (
                                <div className="flex-1 min-w-0">
                                    <p className="truncate font-medium">
                                        {agent?.full_name || 'Agent'}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {agent?.email}
                                    </p>
                                </div>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleSignOut}
                                title="Sign out"
                            >
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative">
                {/* Mobile Header */}
                {isMobile && !sidebarOpen && (
                    <div className="h-16 border-b flex items-center px-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <span className="font-semibold ml-3">
                            ChatCentralize
                        </span>
                    </div>
                )}
                <div className="h-full">{children}</div>
            </main>
        </div>
    )
}
