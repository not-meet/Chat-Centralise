import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { UserPlus2 } from 'lucide-react'
import { supabase } from '@/lib/supabase-browser'
import { useAuth } from '@/contexts/auth.context'
import { Agent } from '@/types/agent'

interface ReassignDialogProps {
    conversationId: string
    currentAgentId?: string
    onReassigned?: () => void
}

export function ReassignDialog({
    conversationId,
    currentAgentId,
    onReassigned,
}: ReassignDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgentId, setSelectedAgentId] = useState<string>('')
    const { agent: currentUser } = useAuth()
    const { toast } = useToast()

    // Fetch available agents when dialog opens
    const loadAgents = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .in('role', ['admin', 'agent'])
                .eq('status', 'active')

            if (error) throw error
            setAgents(data || [])
        } catch (error) {
            console.error('Error loading agents:', error)
            toast({
                title: 'Error',
                description: 'Failed to load available agents',
                variant: 'destructive',
            })
        }
    }

    const handleReassign = async () => {
        if (!selectedAgentId || !currentUser) return

        try {
            setLoading(true)
            const { error } = await supabase.rpc('reassign_conversation', {
                conversation_id: conversationId,
                new_agent_id: selectedAgentId,
                admin_id: currentUser.id,
            })

            if (error) throw error

            toast({
                title: 'Success',
                description: 'Conversation reassigned successfully',
            })

            setIsOpen(false)
            onReassigned?.()
        } catch (error) {
            console.error('Error reassigning conversation:', error)
            toast({
                title: 'Error',
                description: 'Failed to reassign conversation',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open)
                if (open) loadAgents()
            }}
        >
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                    <UserPlus2 className="h-4 w-4" />
                    <span className="sr-only">Reassign conversation</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reassign Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <Select
                        value={selectedAgentId}
                        onValueChange={setSelectedAgentId}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                        <SelectContent>
                            {agents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                    {agent.full_name}{' '}
                                    {agent.id === currentUser?.id
                                        ? '(You)'
                                        : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        onClick={handleReassign}
                        disabled={!selectedAgentId || loading}
                        className="w-full"
                    >
                        {loading ? 'Reassigning...' : 'Reassign'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
