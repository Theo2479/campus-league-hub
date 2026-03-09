import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/api';

interface ChatPreview {
    id: number;
    name: string;
    last_message?: {
        content: string;
        sender_name: string;
        timestamp: string;
    };
}

export function RecentChatsWidget() {
    const [chats, setChats] = useState<ChatPreview[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const res = await apiFetch('/api/chats');
                if (res.ok) {
                    const data = await res.json();
                    // Take top 3
                    setChats(data.chats.slice(0, 3));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchRecent();
    }, []);

    return (
        <Card variant="elevated" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <MessageSquare className="h-4 w-4 text-gold" />
                    Recent Chats
                </CardTitle>
                <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs">
                    <Link to="/chat">
                        View All <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 mt-4">
                    {loading ? (
                        <p className="text-xs text-muted-foreground">Loading chats...</p>
                    ) : chats.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                            No active chats
                        </div>
                    ) : (
                        chats.map(chat => (
                            <Link
                                key={chat.id}
                                to={`/chat`} // Ideally pass state to select this chat
                                className="block p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-sm truncate max-w-[150px]">{chat.name}</span>
                                    {chat.last_message && (
                                        <span className="text-[10px] text-muted-foreground">
                                            {format(new Date(chat.last_message.timestamp), 'MMM d')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                    {chat.last_message ? (
                                        <>
                                            <span className="font-medium text-foreground">{chat.last_message.sender_name}: </span>
                                            {chat.last_message.content}
                                        </>
                                    ) : 'No messages'}
                                </p>
                            </Link>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
