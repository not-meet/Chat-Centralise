import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Users,
    MessageSquare,
    Clock,
    MoreVertical,
    UserPlus,
    Search,
    CheckCircle2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AgentWithStats, WorkloadMetrics } from '@/types/agent'
import { useToast } from '@/components/ui/use-toast'
import { AgentService } from '@/services/agent.service'

const Agents = () => {
    const [agents, setAgents] = useState<AgentWithStats[]>([])
    const [workloadMetrics, setWorkloadMetrics] = useState<WorkloadMetrics>({
        total_agents: 0,
        total_active_chats: 0,
        avg_response_time: 0,
        satisfaction_rate: 0,
    })
    const [loading, setLoading] = useState(true)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [newAgentData, setNewAgentData] = useState({
        email: '',
        full_name: '',
    })
    const { toast } = useToast()
    const [searchQuery, setSearchQuery] = useState<string>('')

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const [agentsData, metricsData] = await Promise.all([
                AgentService.getAgentsWithStats(),
                AgentService.getWorkloadMetrics(),
            ])
            setAgents(agentsData)
            setWorkloadMetrics(metricsData)
        } catch (error) {
            console.error('Failed to load data:', error)
            toast({
                title: 'Error',
                description: 'Failed to load agents data',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => {
        loadData()
    }, [loadData])

    async function handleAddAgent(e: React.FormEvent) {
        e.preventDefault()
        try {
            await AgentService.inviteAgent(
                newAgentData.email,
                newAgentData.full_name
            )
            toast({
                title: 'Success',
                description: 'Agent invited successfully',
            })
            setIsAddDialogOpen(false)
            setNewAgentData({ email: '', full_name: '' })
            loadData()
        } catch (error) {
            console.error('Failed to invite agent:', error)
            toast({
                title: 'Error',
                description:
                    error instanceof Error
                        ? error.message
                        : 'Failed to invite agent',
                variant: 'destructive',
            })
        }
    }

    async function handleStatusChange(
        agentId: string,
        newStatus: 'active' | 'inactive'
    ) {
        try {
            await AgentService.updateAgentStatus(agentId, newStatus)
            toast({
                title: 'Success',
                description: 'Agent status updated successfully',
            })
            loadData()
        } catch (error) {
            console.error('Failed to update status:', error)
            toast({
                title: 'Error',
                description: 'Failed to update agent status',
                variant: 'destructive',
            })
        }
    }

    async function handleDeleteAgent(agentId: string) {
        try {
            await AgentService.deleteAgent(agentId)
            toast({
                title: 'Success',
                description: 'Agent deleted successfully',
            })
            loadData()
        } catch (error) {
            console.error('Failed to delete agent:', error)
            toast({
                title: 'Error',
                description: 'Failed to delete agent',
                variant: 'destructive',
            })
        }
    }

    const filteredAgents = agents.filter(
        (agent) =>
            agent.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    console.log(filteredAgents.length)
    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Agent Management
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Monitor and manage your customer service team
                        </p>
                    </div>
                    <Dialog
                        open={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add Agent
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Agent</DialogTitle>
                                <DialogDescription>
                                    Enter the email and full name of the agent
                                    you want to invite.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={handleAddAgent}
                                className="space-y-4"
                            >
                                <div>
                                    <Input
                                        placeholder="Email"
                                        type="email"
                                        required
                                        value={newAgentData.email}
                                        onChange={(e) =>
                                            setNewAgentData((prev) => ({
                                                ...prev,
                                                email: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div>
                                    <Input
                                        placeholder="Full Name"
                                        required
                                        value={newAgentData.full_name}
                                        onChange={(e) =>
                                            setNewAgentData((prev) => ({
                                                ...prev,
                                                full_name: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <Button type="submit">Invite Agent</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Agents
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {workloadMetrics.total_agents}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Active Conversations
                            </CardTitle>
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {workloadMetrics.total_active_chats}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Avg. Response Time
                            </CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {workloadMetrics.avg_response_time > 0
                                    ? `${Math.round(workloadMetrics.avg_response_time / 60)}m`
                                    : '-'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Satisfaction Rate
                            </CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {workloadMetrics.satisfaction_rate > 0
                                    ? `${Math.round(workloadMetrics.satisfaction_rate)}%`
                                    : '-'}
                            </div>
                            {workloadMetrics.satisfaction_rate > 0 && (
                                <Progress
                                    value={workloadMetrics.satisfaction_rate}
                                    className="mt-2"
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Agents List */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Agents</CardTitle>
                                <CardDescription>
                                    Manage your customer service team
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search agents..."
                                        className="pl-8"
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredAgents.length > 0 ? (
                            <div className='overflow-x-auto max-h-[500px] overflow-y-auto'>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Agent</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Active Chats</TableHead>
                                            <TableHead>Resolved Today</TableHead>
                                            <TableHead>Avg. Response</TableHead>
                                            <TableHead>Satisfaction</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAgents.map((agent) => (
                                            <TableRow key={agent.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            {agent.avatar_url ? (
                                                                <img
                                                                    src={
                                                                        agent.avatar_url
                                                                    }
                                                                    alt={
                                                                        agent.full_name
                                                                    }
                                                                />
                                                            ) : (
                                                                <div className="bg-primary text-primary-foreground rounded-full w-full h-full flex items-center justify-center font-semibold">
                                                                    {agent.full_name.charAt(
                                                                        0
                                                                    )}
                                                                </div>
                                                            )}
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">
                                                                {agent.full_name}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {agent.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            agent.status ===
                                                            'active'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {agent.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {agent.stats.active_chats}
                                                </TableCell>
                                                <TableCell>
                                                    {agent.stats.resolved_today}
                                                </TableCell>
                                                <TableCell>
                                                    {agent.stats.avg_response_time >
                                                    0
                                                        ? `${Math.round(agent.stats.avg_response_time / 60)}m`
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span>
                                                            {agent.stats
                                                                .satisfaction_rate >
                                                            0
                                                                ? `${Math.round(agent.stats.satisfaction_rate)}%`
                                                                : '-'}
                                                        </span>
                                                        {agent.stats
                                                            .satisfaction_rate >
                                                            0 && (
                                                            <Progress
                                                                value={
                                                                    agent.stats
                                                                        .satisfaction_rate
                                                                }
                                                                className="w-20"
                                                            />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>
                                                                Actions
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleStatusChange(
                                                                        agent.id,
                                                                        agent.status ===
                                                                            'active'
                                                                            ? 'inactive'
                                                                            : 'active'
                                                                    )
                                                                }
                                                            >
                                                                {agent.status ===
                                                                'active'
                                                                    ? 'Deactivate'
                                                                    : 'Activate'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-red-600"
                                                                onClick={() =>
                                                                    handleDeleteAgent(
                                                                        agent.id
                                                                    )
                                                                }
                                                            >
                                                                Delete Agent
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <Card className="w-full max-w-md mx-auto p-6 shadow-lg rounded-2xl bg-white">
                                <CardHeader className="flex flex-col items-center text-center">
                                    <CardTitle className="text-xl font-semibold">
                                        No Agent Found
                                    </CardTitle>
                                    <CardDescription className="text-gray-500 mt-2">
                                        {searchQuery
                                            ? 'No agents found with the given search query.'
                                            : 'No agents available at the moment.'}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}

export default Agents
