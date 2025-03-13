import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Megaphone, Plus } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { NewBroadcastDialog } from '@/components/broadcasts/NewBroadcastDialog'
import { broadcastService, type Broadcast } from '@/services/broadcast.service'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'

const Broadcasts = () => {
    const [isNewBroadcastOpen, setIsNewBroadcastOpen] = useState(false)
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
    const [selectedBroadcast, setSelectedBroadcast] =
        useState<Broadcast | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { toast } = useToast()

    const loadBroadcasts = useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await broadcastService.getBroadcasts()
            setBroadcasts(data)
        } catch (error) {
            console.error('Error loading broadcasts:', error)
            toast({
                title: 'Error',
                description: 'Failed to load broadcasts',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }, [toast])

    useEffect(() => {
        loadBroadcasts()
    }, [loadBroadcasts])

    const getStatusColor = (status: Broadcast['status']) => {
        switch (status) {
            case 'sent':
                return 'bg-green-100 text-green-600'
            case 'pending':
                return 'bg-yellow-100 text-yellow-600'
            case 'failed':
                return 'bg-red-100 text-red-600'
            default:
                return 'bg-gray-100 text-gray-600'
        }
    }

    return (
        <DashboardLayout>
            <div className="flex h-full">
                {/* Left side - Broadcasts List */}
                <div className="w-1/3 border-r">
                    <div className="p-4 border-b">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold">Broadcasts</h1>
                            <Button onClick={() => setIsNewBroadcastOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                New Broadcast
                            </Button>
                        </div>
                    </div>
                    <ScrollArea className="h-[calc(100vh-8rem)]">
                        <div className="p-4 space-y-4">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : broadcasts.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No broadcasts yet
                                </div>
                            ) : (
                                broadcasts.map((broadcast) => (
                                    <Card
                                        key={broadcast.id}
                                        className={`cursor-pointer hover:bg-accent transition-colors ${
                                            selectedBroadcast?.id ===
                                            broadcast.id
                                                ? 'border-primary'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            setSelectedBroadcast(broadcast)
                                        }
                                    >
                                        <CardHeader className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <CardTitle className="text-base">
                                                        {broadcast.message_type ===
                                                        'text'
                                                            ? broadcast.message_content.slice(
                                                                  0,
                                                                  50
                                                              ) +
                                                              (broadcast
                                                                  .message_content
                                                                  .length > 50
                                                                  ? '...'
                                                                  : '')
                                                            : broadcast.message_type ===
                                                                'image'
                                                              ? 'Image Broadcast'
                                                              : 'Template Broadcast'}
                                                    </CardTitle>
                                                    <CardDescription className="text-sm">
                                                        {format(
                                                            new Date(
                                                                broadcast.created_at
                                                            ),
                                                            'PPp'
                                                        )}
                                                    </CardDescription>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(broadcast.status)}`}
                                                    >
                                                        {broadcast.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <div className="flex justify-between text-sm text-muted-foreground">
                                                <span>
                                                    Target:{' '}
                                                    {broadcast.target_type}
                                                </span>
                                                <span>
                                                    {broadcast.sent_count}/
                                                    {broadcast.sent_count +
                                                        broadcast.failed_count}{' '}
                                                    sent
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Right side - Selected Broadcast Details or Empty State */}
                <div className="flex-1 p-4">
                    {selectedBroadcast ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold">
                                        Broadcast Details
                                    </h2>
                                    <p className="text-muted-foreground">
                                        Created{' '}
                                        {format(
                                            new Date(
                                                selectedBroadcast.created_at
                                            ),
                                            'PPp'
                                        )}
                                    </p>
                                </div>
                                <span
                                    className={`text-sm px-3 py-1 rounded-full ${getStatusColor(selectedBroadcast.status)}`}
                                >
                                    {selectedBroadcast.status}
                                </span>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Message</CardTitle>
                                    <CardDescription>
                                        Type: {selectedBroadcast.message_type}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {selectedBroadcast.message_type ===
                                    'text' ? (
                                        <p className="whitespace-pre-wrap">
                                            {selectedBroadcast.message_content}
                                        </p>
                                    ) : selectedBroadcast.message_type ===
                                      'image' ? (
                                        <div className="space-y-4">
                                            <img
                                                src={
                                                    selectedBroadcast.media_url
                                                }
                                                alt="Broadcast image"
                                                className="max-w-md rounded-lg"
                                            />
                                            {selectedBroadcast.message_content && (
                                                <p className="text-sm text-muted-foreground">
                                                    {
                                                        selectedBroadcast.message_content
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <p>
                                                Template ID:{' '}
                                                {selectedBroadcast.template_id}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Recipients</CardTitle>
                                    <CardDescription>
                                        Target Type:{' '}
                                        {selectedBroadcast.target_type}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <span>Total Recipients</span>
                                            <span>
                                                {selectedBroadcast.sent_count +
                                                    selectedBroadcast.failed_count}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Successfully Sent</span>
                                            <span className="text-green-600">
                                                {selectedBroadcast.sent_count}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Failed</span>
                                            <span className="text-red-600">
                                                {selectedBroadcast.failed_count}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Megaphone className="h-12 w-12 mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">
                                    No Broadcast Selected
                                </h3>
                                <p>
                                    Select a broadcast to view its details or
                                    create a new one.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <NewBroadcastDialog
                    open={isNewBroadcastOpen}
                    onOpenChange={setIsNewBroadcastOpen}
                    onSuccess={() => {
                        loadBroadcasts()
                        setIsNewBroadcastOpen(false)
                    }}
                />
            </div>
        </DashboardLayout>
    )
}

export default Broadcasts
