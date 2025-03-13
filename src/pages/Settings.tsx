import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
    MessageSquare,
    BellRing,
    Link as LinkIcon,
    Settings as SettingsIcon,
} from 'lucide-react'

const Settings = () => {
    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Settings
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage your application settings and configurations
                        </p>
                    </div>
                </div>

                <Tabs defaultValue="whatsapp" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="whatsapp">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            WhatsApp
                        </TabsTrigger>
                        <TabsTrigger value="notifications">
                            <BellRing className="h-4 w-4 mr-2" />
                            Notifications
                        </TabsTrigger>
                        <TabsTrigger value="integrations">
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Integrations
                        </TabsTrigger>
                        <TabsTrigger value="general">
                            <SettingsIcon className="h-4 w-4 mr-2" />
                            General
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="whatsapp" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    WhatsApp Business API Configuration
                                </CardTitle>
                                <CardDescription>
                                    Configure your WhatsApp Business API
                                    settings and templates
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="api-key">API Key</Label>
                                    <Input
                                        id="api-key"
                                        placeholder="Enter your WhatsApp Business API key"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="webhook-url">
                                        Webhook URL
                                    </Label>
                                    <Input
                                        id="webhook-url"
                                        placeholder="Enter your webhook URL"
                                    />
                                </div>
                                <Separator className="my-4" />
                                <div>
                                    <h4 className="text-sm font-medium mb-2">
                                        Message Templates
                                    </h4>
                                    <Button variant="outline">
                                        Manage Templates
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="notifications" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Notification Settings</CardTitle>
                                <CardDescription>
                                    Configure notification preferences and
                                    alerts
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium">
                                            Chat Notifications
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-3">
                                                <Checkbox id="new-chat" />
                                                <div className="space-y-1 leading-none">
                                                    <Label htmlFor="new-chat">
                                                        New chat notifications
                                                    </Label>
                                                    <p className="text-sm text-muted-foreground">
                                                        Get notified when you
                                                        receive a new chat
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <Checkbox id="mentions" />
                                                <div className="space-y-1 leading-none">
                                                    <Label htmlFor="mentions">
                                                        Mention notifications
                                                    </Label>
                                                    <p className="text-sm text-muted-foreground">
                                                        Get notified when you
                                                        are mentioned in a chat
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium">
                                            Email Notifications
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-3">
                                                <Checkbox id="daily-summary" />
                                                <div className="space-y-1 leading-none">
                                                    <Label htmlFor="daily-summary">
                                                        Daily summary
                                                    </Label>
                                                    <p className="text-sm text-muted-foreground">
                                                        Receive a daily summary
                                                        of your chat activities
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <Checkbox id="urgent-matters" />
                                                <div className="space-y-1 leading-none">
                                                    <Label htmlFor="urgent-matters">
                                                        Urgent matters
                                                    </Label>
                                                    <p className="text-sm text-muted-foreground">
                                                        Get notified immediately
                                                        for urgent messages
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="integrations" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Integrations</CardTitle>
                                <CardDescription>
                                    Manage your Monday.com and other
                                    integrations
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="monday-api">
                                        Monday.com API Key
                                    </Label>
                                    <Input
                                        id="monday-api"
                                        placeholder="Enter your Monday.com API key"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="monday-board">
                                        Default Board ID
                                    </Label>
                                    <Input
                                        id="monday-board"
                                        placeholder="Enter your default board ID"
                                    />
                                </div>
                                <Separator className="my-4" />
                                <Button variant="outline">
                                    Test Connection
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="general" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>General Settings</CardTitle>
                                <CardDescription>
                                    Configure general application settings
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="company-name">
                                            Company Name
                                        </Label>
                                        <Input
                                            id="company-name"
                                            placeholder="Enter your company name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="timezone">
                                            Timezone
                                        </Label>
                                        <Input
                                            id="timezone"
                                            placeholder="Select your timezone"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="language">
                                            Language
                                        </Label>
                                        <Input
                                            id="language"
                                            placeholder="Select your language"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    )
}

export default Settings
