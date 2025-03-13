import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Image, FileText, ChevronDown } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { broadcastService } from '@/services/broadcast.service'
import { useToast } from '@/components/ui/use-toast'
import { LabelService } from '@/services/label.service'
import { Label as LabelType } from '@/types/label'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface NewBroadcastDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

type MessageType = 'text' | 'image'
type TargetType = 'all' | 'label' | 'numbers'

interface RecipientPreview {
    phone_number: string
    name?: string
}

const broadcastFormSchema = z
    .object({
        messageType: z.enum(['text', 'image'] as const),
        message: z.string().max(1000, 'Message is too long').optional(),
        caption: z.string().optional(),
        image: z.any().optional(),
        targetType: z.enum(['all', 'label', 'numbers'] as const),
        label: z.string().optional(),
        numbers: z.string().optional(),
    })
    .refine((data) => data.message || data.caption, {
        message: 'Either Message or Caption is required',
        path: ['message'],
    })

type BroadcastFormValues = z.infer<typeof broadcastFormSchema>

export function NewBroadcastDialog({
    open,
    onOpenChange,
    onSuccess,
}: NewBroadcastDialogProps) {
    const [messageType, setMessageType] = useState<MessageType>('text')
    const [targetType, setTargetType] = useState<TargetType>('all')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [labels, setLabels] = useState<LabelType[]>([])
    const [isLoadingLabels, setIsLoadingLabels] = useState(false)
    const [labelSearchQuery, setLabelSearchQuery] = useState('')
    const { toast } = useToast()
    const [recipientCount, setRecipientCount] = useState<number | null>(null)
    const [recipientPreview, setRecipientPreview] = useState<
        RecipientPreview[]
    >([])
    const [isLoadingRecipients, setIsLoadingRecipients] = useState(false)
    const [labelPopoverOpen, setLabelPopoverOpen] = useState(false)

    const form = useForm<BroadcastFormValues>({
        resolver: zodResolver(broadcastFormSchema),
        defaultValues: {
            messageType: 'text',
            message: '',
            targetType: 'all',
        },
    })

    const loadRecipientInfo = useCallback(async () => {
        try {
            setIsLoadingRecipients(true)
            const labelId = form.getValues('label')

            if (targetType === 'all' || targetType === 'label') {
                const [count, preview] = await Promise.all([
                    broadcastService.getRecipientCount(targetType, labelId),
                    broadcastService.getRecipientPreview(targetType, labelId),
                ])

                setRecipientCount(count)
                setRecipientPreview(preview)
            }
        } catch (error) {
            console.error('Error loading recipient info:', error)
            toast({
                title: 'Error',
                description: 'Failed to load recipient information',
                variant: 'destructive',
            })
        } finally {
            setIsLoadingRecipients(false)
        }
    }, [form, targetType, toast])

    const loadLabels = useCallback(async () => {
        try {
            setIsLoadingLabels(true)
            const labelsData = await LabelService.getLabels()
            console.log('Labels loaded:', labelsData)
            setLabels(labelsData || [])
        } catch (error) {
            console.error('Error loading labels:', error)
            toast({
                title: 'Error',
                description: 'Failed to load labels',
                variant: 'destructive',
            })
            setLabels([])
        } finally {
            setIsLoadingLabels(false)
        }
    }, [toast])

    useEffect(() => {
        if (open) {
            loadLabels()
        }
    }, [loadLabels, open])

    useEffect(() => {
        if (
            open &&
            (targetType === 'all' ||
                (targetType === 'label' && form.getValues('label')))
        ) {
            loadRecipientInfo()
        }
    }, [form, loadRecipientInfo, open, targetType, form.watch('label')])

    const filteredLabels = labels.filter((label) =>
        label.name.toLowerCase().includes(labelSearchQuery.toLowerCase())
    )
    console.log('Filtered labels:', filteredLabels)

    async function onSubmit(data: BroadcastFormValues) {
        try {
            setIsSubmitting(true)

            let mediaUrl: string | undefined

            if (data.messageType === 'image' && data.image) {
                mediaUrl = await broadcastService.uploadImage(
                    data.image as File
                )
            }

            // Create the broadcast
            const broadcast = await broadcastService.createBroadcast({
                message_content:
                    data.messageType === 'text'
                        ? data.message
                        : data.caption || '',
                message_type: data.messageType,
                media_url: mediaUrl,
                target_type: data.targetType,
                target_label: data.label,
                target_numbers:
                    data.targetType === 'numbers'
                        ? data.numbers
                              .split('\n')
                              .map((n) => n.trim())
                              .filter(Boolean)
                        : undefined,
            })

            console.log('Broadcast created:', broadcast)
            // Send the broadcast
            const result = await broadcastService.sendBroadcast(broadcast)

            toast({
                title: 'Success',
                description: `Broadcast created and queued for ${result.totalRecipients} recipients`,
            })

            onSuccess()
        } catch (error) {
            console.error('Error creating/sending broadcast:', error)
            toast({
                title: 'Error',
                description:
                    error instanceof Error
                        ? error.message
                        : 'Failed to create/send broadcast',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>New Broadcast</DialogTitle>
                    <DialogDescription>
                        Create a new broadcast message to send to your
                        customers.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                    >
                        <div className="space-y-6 py-4">
                            {/* Message Type Selection */}
                            <div className="space-y-2">
                                <Label>Message Type</Label>
                                <Tabs
                                    defaultValue="text"
                                    onValueChange={(v: string) => {
                                        setMessageType(v as MessageType)
                                        form.setValue(
                                            'messageType',
                                            v as MessageType
                                        )
                                    }}
                                    className="w-full"
                                >
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="text">
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Text
                                        </TabsTrigger>
                                        <TabsTrigger value="image">
                                            <Image className="h-4 w-4 mr-2" />
                                            Image
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent
                                        value="text"
                                        className="space-y-4"
                                    >
                                        <FormField
                                            control={form.control}
                                            name="message"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Message
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Type your broadcast message here..."
                                                            className="min-h-[100px]"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </TabsContent>

                                    <TabsContent
                                        value="image"
                                        className="space-y-4"
                                    >
                                        <FormField
                                            control={form.control}
                                            name="image"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Image</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) =>
                                                                field.onChange(
                                                                    e.target
                                                                        .files?.[0]
                                                                )
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="caption"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Caption (optional)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Add a caption to your image..."
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </div>

                            {/* Target Selection */}
                            <div className="space-y-2">
                                <Label>Send To</Label>
                                <Tabs
                                    defaultValue="all"
                                    onValueChange={(v: string) => {
                                        setTargetType(v as TargetType)
                                        form.setValue(
                                            'targetType',
                                            v as TargetType
                                        )
                                        // Reset label and numbers when changing target type
                                        if (v !== 'label') {
                                            form.setValue('label', '')
                                        }
                                        if (v !== 'numbers') {
                                            form.setValue('numbers', '')
                                        }
                                    }}
                                    className="w-full"
                                >
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="all">
                                            All
                                        </TabsTrigger>
                                        <TabsTrigger value="label">
                                            By Label
                                        </TabsTrigger>
                                        <TabsTrigger value="numbers">
                                            Numbers
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent
                                        value="all"
                                        className="pt-2 space-y-4"
                                    >
                                        <p className="text-sm text-muted-foreground">
                                            Message will be sent to all
                                            customers.
                                        </p>
                                        {isLoadingRecipients ? (
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-20 w-full" />
                                            </div>
                                        ) : (
                                            recipientCount !== null && (
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium">
                                                        {recipientCount}{' '}
                                                        recipient
                                                        {recipientCount !== 1
                                                            ? 's'
                                                            : ''}
                                                    </p>
                                                    {recipientPreview.length >
                                                        0 && (
                                                        <div className="bg-muted p-3 rounded-md space-y-1">
                                                            <p className="text-xs text-muted-foreground">
                                                                Preview:
                                                            </p>
                                                            {recipientPreview.map(
                                                                (
                                                                    recipient,
                                                                    i
                                                                ) => (
                                                                    <div
                                                                        key={i}
                                                                        className="text-sm"
                                                                    >
                                                                        {recipient.name ||
                                                                            recipient.phone_number}
                                                                    </div>
                                                                )
                                                            )}
                                                            {recipientCount >
                                                                recipientPreview.length && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    and{' '}
                                                                    {recipientCount -
                                                                        recipientPreview.length}{' '}
                                                                    more...
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </TabsContent>

                                    <TabsContent
                                        value="label"
                                        className="space-y-4"
                                    >
                                        <FormField
                                            control={form.control}
                                            name="label"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>
                                                        Select Label
                                                    </FormLabel>
                                                    <Popover
                                                        open={labelPopoverOpen}
                                                        onOpenChange={
                                                            setLabelPopoverOpen
                                                        }
                                                    >
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                aria-expanded={
                                                                    labelPopoverOpen
                                                                }
                                                                className={cn(
                                                                    'w-full justify-between',
                                                                    !field.value &&
                                                                        'text-muted-foreground'
                                                                )}
                                                                disabled={
                                                                    isLoadingLabels
                                                                }
                                                                onClick={() =>
                                                                    setLabelPopoverOpen(
                                                                        true
                                                                    )
                                                                }
                                                            >
                                                                {isLoadingLabels ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                                                        Loading...
                                                                    </div>
                                                                ) : field.value ? (
                                                                    labels.find(
                                                                        (
                                                                            label
                                                                        ) =>
                                                                            label.id ===
                                                                            field.value
                                                                    )?.name ||
                                                                    'Select a label'
                                                                ) : (
                                                                    'Select a label'
                                                                )}
                                                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[300px] p-0">
                                                            <Command>
                                                                <CommandInput
                                                                    placeholder={
                                                                        isLoadingLabels
                                                                            ? 'Loading labels...'
                                                                            : 'Search labels...'
                                                                    }
                                                                    onValueChange={
                                                                        setLabelSearchQuery
                                                                    }
                                                                />
                                                                <CommandList>
                                                                    <CommandEmpty>
                                                                        {isLoadingLabels
                                                                            ? 'Loading...'
                                                                            : 'No label found.'}
                                                                    </CommandEmpty>
                                                                    <CommandGroup heading="Labels">
                                                                        {isLoadingLabels ? (
                                                                            <div className="flex items-center justify-center py-6">
                                                                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                                                            </div>
                                                                        ) : filteredLabels.length ===
                                                                          0 ? (
                                                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                                                No
                                                                                labels
                                                                                available
                                                                            </div>
                                                                        ) : (
                                                                            filteredLabels.map(
                                                                                (
                                                                                    label
                                                                                ) => (
                                                                                    <CommandItem
                                                                                        key={
                                                                                            label.id
                                                                                        }
                                                                                        onSelect={() => {
                                                                                            form.setValue(
                                                                                                'label',
                                                                                                label.id
                                                                                            )
                                                                                            setLabelPopoverOpen(
                                                                                                false
                                                                                            )
                                                                                        }}
                                                                                    >
                                                                                        <Check
                                                                                            className={cn(
                                                                                                'mr-2 h-4 w-4',
                                                                                                label.id ===
                                                                                                    field.value
                                                                                                    ? 'opacity-100'
                                                                                                    : 'opacity-0'
                                                                                            )}
                                                                                        />
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div
                                                                                                className="h-3 w-3 rounded-full"
                                                                                                style={{
                                                                                                    backgroundColor:
                                                                                                        label.color,
                                                                                                }}
                                                                                            />
                                                                                            {
                                                                                                label.name
                                                                                            }
                                                                                        </div>
                                                                                    </CommandItem>
                                                                                )
                                                                            )
                                                                        )}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {form.watch('label') &&
                                            (isLoadingRecipients ? (
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-32" />
                                                    <Skeleton className="h-20 w-full" />
                                                </div>
                                            ) : (
                                                recipientCount !== null && (
                                                    <div className="space-y-2">
                                                        <p className="text-sm font-medium">
                                                            {recipientCount}{' '}
                                                            recipient
                                                            {recipientCount !==
                                                            1
                                                                ? 's'
                                                                : ''}{' '}
                                                            with this label
                                                        </p>
                                                        {recipientPreview.length >
                                                            0 && (
                                                            <div className="bg-muted p-3 rounded-md space-y-1">
                                                                <p className="text-xs text-muted-foreground">
                                                                    Preview:
                                                                </p>
                                                                {recipientPreview.map(
                                                                    (
                                                                        recipient,
                                                                        i
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                i
                                                                            }
                                                                            className="text-sm"
                                                                        >
                                                                            {recipient.name ||
                                                                                recipient.phone_number}
                                                                        </div>
                                                                    )
                                                                )}
                                                                {recipientCount >
                                                                    recipientPreview.length && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        and{' '}
                                                                        {recipientCount -
                                                                            recipientPreview.length}{' '}
                                                                        more...
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            ))}
                                    </TabsContent>

                                    <TabsContent
                                        value="numbers"
                                        className="space-y-4"
                                    >
                                        <FormField
                                            control={form.control}
                                            name="numbers"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder={`Only existing contact numbers from the conversation are allowed.\ne.g.\n+91945XXXXXXX\n+9195674XXXXX`}
                                                            className="min-h-[100px]"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting
                                    ? 'Creating...'
                                    : 'Send Broadcast'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
