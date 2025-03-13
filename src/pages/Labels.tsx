'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Label as LabelComponent } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Tag,
    Plus,
    Search,
    MoreVertical,
    Trash,
    Edit,
    BarChart3,
} from 'lucide-react'
import type { Label, LabelStats } from '@/types/label'
import { useToast } from '@/components/ui/use-toast'
import { LabelService } from '@/services/label.service'
import { useAuth } from '@/contexts/auth.context'

const Labels = () => {
    const [labels, setLabels] = useState<Label[]>([])
    const [stats, setStats] = useState<LabelStats | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [newLabel, setNewLabel] = useState({
        name: '',
        description: '',
        color: '#000000',
    })
    const [editLabel, setEditLabel] = useState<Label | null>(null)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const { toast } = useToast()
    const { agent } = useAuth()

    // Load labels and stats
    useEffect(() => {
        const loadData = async () => {
            try {
                const [labelsData, statsData] = await Promise.all([
                    LabelService.getLabels(),
                    LabelService.getLabelStats(),
                ])
                setLabels(labelsData)
                setStats(statsData)
            } catch (error) {
                console.error('Error loading labels:', error)
                toast({
                    title: 'Error',
                    description: 'Failed to load labels',
                    variant: 'destructive',
                })
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [toast])

    const handleCreateLabel = async () => {
        if (!newLabel.name.trim()) {
            toast({
                title: 'Error',
                description: 'Label name is required',
                variant: 'destructive',
            })
            return
        }

        if (!agent) {
            toast({
                title: 'Error',
                description: 'You must be logged in to create labels',
                variant: 'destructive',
            })
            return
        }

        try {
            setIsCreating(true)
            const createdLabel = await LabelService.createLabel({
                name: newLabel.name,
                description: newLabel.description,
                color: newLabel.color,
                created_by: agent.id,
                is_active: true,
            })

            setLabels([...labels, createdLabel])
            setNewLabel({ name: '', description: '', color: '#000000' })
            toast({
                title: 'Success',
                description: 'Label created successfully',
            })
            setCreateDialogOpen(false)
        } catch (error) {
            console.error('Error creating label:', error)
            toast({
                title: 'Error',
                description: 'Failed to create label',
                variant: 'destructive',
            })
        } finally {
            setIsCreating(false)
        }
    }

    const handleEditLabel = (label: Label) => {
        setEditLabel(label)
        setEditDialogOpen(true)
    }

    const handleUpdateLabel = async () => {
        if (!editLabel) return

        if (!editLabel.name.trim()) {
            toast({
                title: 'Error',
                description: 'Label name is required',
                variant: 'destructive',
            })
            return
        }

        try {
            setIsUpdating(true)
            await LabelService.updateLabel(editLabel.id, {
                name: editLabel.name,
                description: editLabel.description,
                color: editLabel.color,
            })

            // Manually update the state using the existing editLabel
            setLabels(
                labels.map((label) =>
                    label.id === editLabel.id
                        ? {
                              ...label,
                              name: editLabel.name,
                              description: editLabel.description,
                              color: editLabel.color,
                          }
                        : label
                )
            )

            toast({
                title: 'Success',
                description: 'Label updated successfully',
            })
            setEditDialogOpen(false)
        } catch (error) {
            console.error('Error updating label:', error)
            toast({
                title: 'Error',
                description: 'Failed to update label',
                variant: 'destructive',
            })
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDeleteLabel = async (labelId: string) => {
        try {
            await LabelService.deleteLabel(labelId)
            setLabels(labels.filter((label) => label.id !== labelId))
            toast({
                title: 'Success',
                description: 'Label deleted successfully',
            })
        } catch (error) {
            console.error('Error deleting label:', error)
            toast({
                title: 'Error',
                description: 'Failed to delete label',
                variant: 'destructive',
            })
        }
    }

    const filteredLabels = labels.filter(
        (label) =>
            label.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            label.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="p-6">Loading...</div>
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
                            Labels
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage and organize your conversation labels
                        </p>
                    </div>
                    <Dialog
                        open={createDialogOpen}
                        onOpenChange={setCreateDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button onClick={() => setCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Label
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Label</DialogTitle>
                                <DialogDescription>
                                    Add a new label to organize your
                                    conversations
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <LabelComponent htmlFor="label-name">
                                        Name
                                    </LabelComponent>
                                    <Input
                                        id="label-name"
                                        placeholder="Enter label name"
                                        value={newLabel.name}
                                        onChange={(e) =>
                                            setNewLabel({
                                                ...newLabel,
                                                name: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <LabelComponent htmlFor="label-description">
                                        Description
                                    </LabelComponent>
                                    <Textarea
                                        id="label-description"
                                        placeholder="Enter label description"
                                        value={newLabel.description}
                                        onChange={(e) =>
                                            setNewLabel({
                                                ...newLabel,
                                                description: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <LabelComponent htmlFor="label-color">
                                        Color
                                    </LabelComponent>
                                    <Input
                                        id="label-color"
                                        type="color"
                                        value={newLabel.color}
                                        onChange={(e) =>
                                            setNewLabel({
                                                ...newLabel,
                                                color: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setCreateDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateLabel}
                                    disabled={isCreating}
                                >
                                    {isCreating ? 'Creating...' : 'Create'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Edit Label Dialog */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Label</DialogTitle>
                            <DialogDescription>
                                Update label information
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <LabelComponent htmlFor="edit-label-name">
                                    Name
                                </LabelComponent>
                                <Input
                                    id="edit-label-name"
                                    placeholder="Enter label name"
                                    value={editLabel?.name || ''}
                                    onChange={(e) =>
                                        setEditLabel(
                                            editLabel
                                                ? {
                                                      ...editLabel,
                                                      name: e.target.value,
                                                  }
                                                : null
                                        )
                                    }
                                />
                            </div>
                            <div>
                                <LabelComponent htmlFor="edit-label-description">
                                    Description
                                </LabelComponent>
                                <Textarea
                                    id="edit-label-description"
                                    placeholder="Enter label description"
                                    value={editLabel?.description || ''}
                                    onChange={(e) =>
                                        setEditLabel(
                                            editLabel
                                                ? {
                                                      ...editLabel,
                                                      description:
                                                          e.target.value,
                                                  }
                                                : null
                                        )
                                    }
                                />
                            </div>
                            <div>
                                <LabelComponent htmlFor="edit-label-color">
                                    Color
                                </LabelComponent>
                                <Input
                                    id="edit-label-color"
                                    type="color"
                                    value={editLabel?.color || '#000000'}
                                    onChange={(e) =>
                                        setEditLabel(
                                            editLabel
                                                ? {
                                                      ...editLabel,
                                                      color: e.target.value,
                                                  }
                                                : null
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setEditDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpdateLabel}
                                disabled={isUpdating}
                            >
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Statistics Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Labels
                            </CardTitle>
                            <Tag className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats?.total_labels || 0}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Most Used Label
                            </CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats?.most_used_labels?.[0]?.label_name ||
                                    '-'}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Used{' '}
                                {stats?.most_used_labels?.[0]?.usage_count || 0}{' '}
                                times
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Labels List */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>All Labels</CardTitle>
                                <CardDescription>
                                    View and manage all your conversation labels
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search labels..."
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
                        {filteredLabels.length > 0 ? (
                            <div className='overflow-x-auto max-h-[500px] overflow-y-auto'>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Label</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Usage</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredLabels.map((label) => (
                                            <TableRow key={label.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-4 h-4 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    label.color ||
                                                                    '#000000',
                                                            }}
                                                        />
                                                        <span className="font-medium">
                                                            {label.name}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {label.description}
                                                </TableCell>
                                                <TableCell>
                                                    {label.usage_count || 0}{' '}
                                                    conversations
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(
                                                        label.created_at
                                                    ).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>
                                                                Actions
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleEditLabel(
                                                                        label
                                                                    )
                                                                }
                                                            >
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit Label
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-red-600"
                                                                onClick={() =>
                                                                    handleDeleteLabel(
                                                                        label.id
                                                                    )
                                                                }
                                                            >
                                                                <Trash className="mr-2 h-4 w-4" />
                                                                Delete Label
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
                                        No Labels Found
                                    </CardTitle>
                                    <CardDescription className="text-gray-500 mt-2">
                                        {searchQuery
                                            ? 'No label found for the given search query.'
                                            : 'No labels available. Please create a new one.'}
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

export default Labels
