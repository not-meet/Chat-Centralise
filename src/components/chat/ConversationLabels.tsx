import { useState, useEffect } from 'react'
import { Tag, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/types/label'
import { supabase } from '@/lib/supabase-browser'
import { useToast } from '@/components/ui/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/auth.context'

interface ConversationLabelsProps {
    conversationId: string
    onLabelsChange?: () => void
}

export function ConversationLabels({
    conversationId,
    onLabelsChange,
}: ConversationLabelsProps) {
    const [labels, setLabels] = useState<Label[]>([])
    const [selectedLabels, setSelectedLabels] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showNewLabel, setShowNewLabel] = useState(false)
    const [newLabel, setNewLabel] = useState({ name: '', color: '#6366F1' })
    const { toast } = useToast()
    const { agent } = useAuth()

    // Fetch all available labels and currently selected labels
    useEffect(() => {
        async function fetchLabels() {
            try {
                // Fetch all labels
                const { data: allLabels, error: labelsError } = await supabase
                    .from('labels')
                    .select('*, conversation_labels(count)')
                    .eq('is_active', true)

                if (labelsError) throw labelsError

                // Fetch selected labels for this conversation
                const { data: selectedLabels, error: selectedError } =
                    await supabase
                        .from('conversation_labels')
                        .select('label_id')
                        .eq('conversation_id', conversationId)

                if (selectedError) throw selectedError

                setLabels(
                    allLabels?.map((label) => ({
                        ...label,
                        usage_count: label.conversation_labels?.[0]?.count || 0,
                    })) || []
                )
                setSelectedLabels(
                    selectedLabels?.map((sl) => sl.label_id) || []
                )
            } catch (error) {
                console.error('Error fetching labels:', error)
                toast({
                    title: 'Error',
                    description: 'Failed to load labels',
                    variant: 'destructive',
                })
            } finally {
                setLoading(false)
            }
        }

        fetchLabels()
    }, [conversationId])

    const toggleLabel = async (labelId: string) => {
        const isSelected = selectedLabels.includes(labelId)
        try {
            if (isSelected) {
                // Remove label
                const { error } = await supabase
                    .from('conversation_labels')
                    .delete()
                    .eq('conversation_id', conversationId)
                    .eq('label_id', labelId)

                if (error) throw error
                setSelectedLabels((prev) => prev.filter((id) => id !== labelId))
            } else {
                // Add label
                console.log('Adding label:', {
                    conversation_id: conversationId,
                    label_id: labelId,
                    created_by: agent?.id,
                })

                const { data, error } = await supabase
                    .from('conversation_labels')
                    .insert({
                        conversation_id: conversationId,
                        label_id: labelId,
                        created_by: agent?.id,
                    })
                    .select()
                    .single()

                console.log('Add label result:', { data, error })

                if (error) {
                    console.error('Detailed error:', error)
                    throw new Error(
                        `Failed to add label: ${error.message} (${error.code})`
                    )
                }

                setSelectedLabels((prev) => [...prev, labelId])
            }
            onLabelsChange?.()
        } catch (error) {
            console.error('Error toggling label:', error)
            toast({
                title: 'Error',
                description:
                    error instanceof Error
                        ? error.message
                        : 'Failed to modify label',
                variant: 'destructive',
            })
        }
    }

    const createNewLabel = async () => {
        if (!newLabel.name.trim()) return

        try {
            console.log('Creating new label:', {
                name: newLabel.name.trim(),
                color: newLabel.color,
                created_by: agent?.id,
            })

            const { data, error } = await supabase
                .from('labels')
                .insert({
                    name: newLabel.name.trim(),
                    color: newLabel.color,
                    created_by: agent?.id,
                    is_active: true,
                })
                .select()
                .single()

            console.log('Create label result:', { data, error })

            if (error) {
                console.error('Detailed error:', error)
                throw new Error(
                    `Failed to create label: ${error.message} (${error.code})`
                )
            }

            setLabels((prev) => [...prev, { ...data, usage_count: 0 }])
            setNewLabel({ name: '', color: '#6366F1' })
            setShowNewLabel(false)

            // Automatically apply the new label
            if (data) {
                await toggleLabel(data.id)
            }

            toast({
                title: 'Success',
                description: 'Label created and applied',
            })
        } catch (error) {
            console.error('Error creating label:', error)
            toast({
                title: 'Error',
                description:
                    error instanceof Error
                        ? error.message
                        : 'Failed to create label',
                variant: 'destructive',
            })
        }
    }

    const filteredLabels = labels.filter((label) =>
        label.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="flex flex-wrap gap-2 items-center">
            {/* Display selected labels */}
            {labels
                .filter((label) => selectedLabels.includes(label.id))
                .map((label) => (
                    <Badge
                        key={label.id}
                        variant="secondary"
                        className="cursor-pointer hover:opacity-80"
                        style={{
                            backgroundColor: label.color,
                            color: getContrastColor(label.color),
                        }}
                        onClick={() => toggleLabel(label.id)}
                    >
                        {label.name}
                        <X className="h-3 w-3 ml-1" />
                    </Badge>
                ))}

            {/* Add labels popover */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7">
                        <Plus className="h-4 w-4 mr-1" />
                        Labels
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <div className="space-y-4">
                        <div className="font-medium flex items-center justify-between">
                            <span>Manage Labels</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowNewLabel(true)}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                New Label
                            </Button>
                        </div>

                        {showNewLabel && (
                            <div className="space-y-2 p-2 border rounded-md">
                                <Input
                                    placeholder="Label name"
                                    value={newLabel.name}
                                    onChange={(e) =>
                                        setNewLabel((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                />
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="color"
                                        value={newLabel.color}
                                        onChange={(e) =>
                                            setNewLabel((prev) => ({
                                                ...prev,
                                                color: e.target.value,
                                            }))
                                        }
                                        className="w-20"
                                    />
                                    <Button
                                        size="sm"
                                        className="flex-1"
                                        onClick={createNewLabel}
                                        disabled={!newLabel.name.trim()}
                                    >
                                        Create
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowNewLabel(false)
                                            setNewLabel({
                                                name: '',
                                                color: '#6366F1',
                                            })
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        <Input
                            placeholder="Search labels..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        <ScrollArea className="h-72">
                            <div className="space-y-4">
                                {filteredLabels.map((label) => (
                                    <div
                                        key={label.id}
                                        className="flex items-center space-x-2"
                                    >
                                        <Checkbox
                                            id={label.id}
                                            checked={selectedLabels.includes(
                                                label.id
                                            )}
                                            onCheckedChange={() =>
                                                toggleLabel(label.id)
                                            }
                                        />
                                        <label
                                            htmlFor={label.id}
                                            className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        label.color,
                                                }}
                                            />
                                            <span className="flex-1">
                                                {label.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {label.usage_count}{' '}
                                                {label.usage_count === 1
                                                    ? 'chat'
                                                    : 'chats'}
                                            </span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

// Helper function to determine text color based on background
function getContrastColor(hexcolor: string) {
    // Convert hex to RGB
    const r = parseInt(hexcolor.slice(1, 3), 16)
    const g = parseInt(hexcolor.slice(3, 5), 16)
    const b = parseInt(hexcolor.slice(5, 7), 16)

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    return luminance > 0.5 ? '#000000' : '#ffffff'
}
