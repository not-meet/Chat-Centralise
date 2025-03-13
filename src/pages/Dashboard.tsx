import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { ChatLayout } from '@/components/chat/ChatLayout'

export default function Dashboard() {
    return (
        <DashboardLayout>
            <ChatLayout />
        </DashboardLayout>
    )
}
