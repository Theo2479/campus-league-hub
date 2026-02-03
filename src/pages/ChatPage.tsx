import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Search, Send, Phone, Video, Info, MoreVertical, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ChatChannel {
    id: number;
    name: string;
    type: 'direct' | 'game' | 'announcement';
    fixture_id?: number;
    last_message?: {
        content: string;
        sender_name: string;
        timestamp: string;
    };
}

interface Message {
    id: number;
    sender_id: number;
    sender_name: string;
    content: string;
    timestamp: string;
}

const ChatPage = () => {
    const { user } = useAuth();
    const [chats, setChats] = useState<ChatChannel[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        fetchChats();
        const interval = setInterval(fetchChats, 10000); // Refresh list occasionally
        return () => clearInterval(interval);
    }, []);

    // Fetch Messages when chat selected
    useEffect(() => {
        if (selectedChatId) {
            fetchMessages(selectedChatId);
            const interval = setInterval(() => fetchMessages(selectedChatId), 3000); // Poll messages
            return () => clearInterval(interval);
        }
    }, [selectedChatId]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchChats = async () => {
        try {
            const res = await fetch('/api/chats', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setChats(data.chats);
                if (!selectedChatId && data.chats.length > 0) {
                    // Optional: Auto-select first chat?
                    // setSelectedChatId(data.chats[0].id);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (chatId: number) => {
        try {
            const res = await fetch(`/api/chats/${chatId}/messages`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChatId) return;

        try {
            const res = await fetch(`/api/chats/${selectedChatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newMessage }),
                credentials: 'include'
            });

            if (res.ok) {
                setNewMessage('');
                fetchMessages(selectedChatId); // Instant refresh
                fetchChats(); // Update sidebar preview
            }
        } catch (error) {
            toast.error('Failed to send message');
        }
    };

    const selectedChat = chats.find(c => c.id === selectedChatId);

    return (
        <DashboardLayout>
            <div className="flex h-[calc(100vh-6rem)] gap-4 overflow-hidden rounded-lg border bg-background shadow-sm">

                {/* Sidebar */}
                <div className="w-80 flex flex-col border-r bg-muted/10">
                    <div className="p-4 border-b">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-navy">Chats</h2>
                            <Button size="icon" variant="ghost">
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                className="pl-8 bg-background"
                            />
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="flex flex-col gap-1 p-2">
                            {chats.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => setSelectedChatId(chat.id)}
                                    className={cn(
                                        "flex flex-col items-start gap-1 rounded-lg p-3 text-left text-sm transition-all hover:bg-accent",
                                        selectedChatId === chat.id && "bg-accent"
                                    )}
                                >
                                    <div className="flex w-full flex-col gap-1">
                                        <div className="flex items-center">
                                            <div className="flex items-center gap-2">
                                                <div className="font-semibold">{chat.name}</div>
                                                {/* <span className="flex h-2 w-2 rounded-full bg-blue-600" /> */}
                                            </div>
                                            <div className="ml-auto text-xs text-muted-foreground">
                                                {chat.last_message && format(new Date(chat.last_message.timestamp), 'h:mm a')}
                                            </div>
                                        </div>
                                        <div className="line-clamp-2 text-xs text-muted-foreground">
                                            {chat.last_message ? (
                                                <>
                                                    <span className="font-medium text-foreground">
                                                        {chat.last_message.sender_name}:
                                                    </span>{" "}
                                                    {chat.last_message.content}
                                                </>
                                            ) : (
                                                "No messages yet"
                                            )}
                                        </div>
                                    </div>
                                    {chat.type === 'game' && (
                                        <div className="mt-1">
                                            <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                Match
                                            </span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-background">
                    {selectedChat ? (
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src="/placeholder-user.jpg" />
                                        <AvatarFallback>
                                            {selectedChat.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-semibold">{selectedChat.name}</div>
                                        <div className="text-xs text-muted-foreground"> {selectedChat.type === 'game' ? 'Game Channel' : 'Direct Message'} </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Placeholder buttons for MS Teams vibe */}
                                    <Button variant="ghost" size="icon">
                                        <Phone className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <Video className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <Info className="h-4 w-4" />
                                    </Button>

                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                                {messages.map((msg, index) => {
                                    const isMe = msg.sender_id === user?.id;
                                    const showHeader = index === 0 || messages[index - 1].sender_id !== msg.sender_id;

                                    return (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                                                isMe
                                                    ? "ml-auto bg-primary text-primary-foreground"
                                                    : "bg-muted"
                                            )}
                                        >
                                            {showHeader && !isMe && (
                                                <span className="font-bold text-xs text-navy">
                                                    {msg.sender_name}
                                                </span>
                                            )}
                                            {msg.content}
                                            <span className="text-[10px] opacity-70 self-end">
                                                {format(new Date(msg.timestamp), 'h:mm a')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <Input
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <div className="p-4 rounded-full bg-muted mb-4">
                                <div className="h-12 w-12" /> {/* Icon placeholder */}
                                <Info className="h-12 w-12" />
                            </div>
                            <h3 className="text-lg font-medium">Select a chat to start messaging</h3>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ChatPage;
