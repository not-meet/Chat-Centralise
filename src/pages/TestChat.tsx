import ChatInterface from '@/components/chat/ChatInterface'

export default function TestChat() {
    // Replace this with your actual WhatsApp number that you used to join the sandbox
    const yourWhatsAppNumber = '+919182302594'

    return (
        <div className="h-screen">
            <ChatInterface
                customerName="Test User"
                customerPhone={yourWhatsAppNumber}
                chatId="1"
            />
        </div>
    )
}
