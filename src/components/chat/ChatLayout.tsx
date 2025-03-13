import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable'
import { ChatList } from './ChatList'
import ChatInterface from './ChatInterface'
import { ContactInfo } from './ContactInfo'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Info } from 'lucide-react'

interface Contact {
    id: string
    full_name: string | null
    phone: string
    metadata: Record<string, unknown>
}

export function ChatLayout() {
    const [selectedChatId, setSelectedChatId] = useState<string>()
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
    const [showChatList, setShowChatList] = useState(true)
    const [showContactInfo, setShowContactInfo] = useState(false)
    const isMobile = useMediaQuery('(max-width: 768px)')

    useEffect(() => {
        if (!selectedChatId) {
            setSelectedContact(null)
            setShowContactInfo(false)
            return
        }

        async function fetchContact() {
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', selectedChatId)
                .single()

            if (error || !data) return

            const contact: Contact = {
                id: data.contact_id,
                full_name: data.metadata?.profile_name || null,
                phone: data.metadata?.phone || '',
                metadata: data.metadata || {},
            }

            setSelectedContact(contact)
        }

        fetchContact()
    }, [selectedChatId])

    useEffect(() => {
        if (isMobile && selectedChatId) {
            setShowChatList(false)
        } else {
            setShowChatList(true)
        }
    }, [selectedChatId, isMobile])

    const handleChatSelect = (chatId: string) => {
        setSelectedChatId(chatId)
        if (isMobile) {
            setShowChatList(false)
        }
    }

    const handleBackToList = () => {
        if (isMobile) {
            setShowChatList(true)
            setSelectedChatId(undefined)
        }
    }

    const toggleContactInfo = () => {
        setShowContactInfo((prev) => !prev)
    }

    return (
        <div className="relative h-full w-full">
            {/* Mobile View */}
            {isMobile ? (
                <div className="relative h-full w-full">
                    {/* Chat List */}
                    <div
                        className={`fixed top-0 left-0 h-full w-full bg-white transition-transform duration-300 z-20 ${
                            showChatList ? 'translate-x-0' : '-translate-x-full'
                        }`}
                    >
                        <ChatList onSelectChat={handleChatSelect} />
                    </div>

                    {/* Chat Interface */}
                    <div
                        className={`fixed top-0 left-0 h-full w-full bg-white transition-transform duration-300 z-30 ${
                            showChatList ? 'translate-x-full' : 'translate-x-0'
                        }`}
                    >
                        <div className="flex items-center border-b p-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleBackToList}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="flex-1">
                            {selectedChatId && (
                                <ChatInterface chatId={selectedChatId} />
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* Desktop View */
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel defaultSize={25} minSize={20}>
                        <ChatList onSelectChat={setSelectedChatId} />
                    </ResizablePanel>

                    <ResizableHandle />

                    <ResizablePanel defaultSize={50} minSize={30}>
                        {selectedChatId ? (
                            <div className="relative h-full">
                                <ChatInterface chatId={selectedChatId} />

                                {/* Toggle Contact Info Button */}
                                <Button
                                    className="absolute top-2 right-2"
                                    onClick={toggleContactInfo}
                                >
                                    <Info className="h-5 w-5" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                                Select a conversation to start chatting
                            </div>
                        )}
                    </ResizablePanel>

                    {/* Contact Info Panel with Smooth Slide Animation */}
                    <div
                        className={`transition-all duration-500 ease-in-out ${
                            showContactInfo
                                ? 'w-1/4 opacity-100'
                                : 'w-0 opacity-0'
                        } overflow-hidden`}
                        style={{ transitionProperty: 'width, opacity' }}
                    >
                        {showContactInfo && (
                            <ContactInfo contact={selectedContact} />
                        )}
                    </div>
                </ResizablePanelGroup>
            )}
        </div>
    )
}
