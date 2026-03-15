import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search, Send, Info, Plus, Wifi, WifiOff, Users, MessageSquare, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';
import { apiFetch } from '@/lib/api';

interface ChatChannel {
    id: number;
    name: string;
    type: 'direct' | 'game' | 'group' | 'announcement';
    fixture_id?: number;
    last_message?: {
        content: string;
        sender_name: string;
        timestamp: string;
    };
}

interface Message {
    id: number;
    channel_id: number;
    sender_id: number;
    sender_name: string;
    content: string;
    timestamp: string;
}

interface TypingUser {
    user_id: number;
    user_name: string;
}

interface SearchUser {
    id: number;
    name: string;
    role: string;
    existing_chat_id: number | null;
}

const ChatPage = () => {
    const { user } = useAuth();
    const { isConnected, on, sendMessage, joinChannel, leaveChannel, setTyping, markRead } = useSocket();

    const [chats, setChats] = useState<ChatChannel[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Create group dialog state
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
    const [allUsers, setAllUsers] = useState<SearchUser[]>([]);

    // Announcement dialog state
    const [showAnnouncement, setShowAnnouncement] = useState(false);
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');

    // Delete chat dialog state
    const [showDeleteChat, setShowDeleteChat] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isAdmin = user?.role === 'admin';
    const isCaptain = user?.role === 'captain';
    const canCreateChat = isAdmin || isCaptain;  // Admins and captains can create chats

    // Initial chat list fetch
    useEffect(() => {
        fetchChats();
    }, []);

    // Listen for new messages via WebSocket
    useEffect(() => {
        const handleNewMessage = (msg: Message) => {
            if (selectedChatId && msg.channel_id === selectedChatId) {
                setMessages(prev => [...prev, msg]);
            }

            setChats(prev => prev.map(chat => {
                if (chat.id === msg.channel_id) {
                    return {
                        ...chat,
                        last_message: {
                            content: msg.content,
                            sender_name: msg.sender_name,
                            timestamp: msg.timestamp
                        }
                    };
                }
                return chat;
            }));
        };

        const handleTyping = (data: { user_id: number; user_name: string; is_typing: boolean }) => {
            if (data.is_typing) {
                setTypingUsers(prev => {
                    if (!prev.find(u => u.user_id === data.user_id)) {
                        return [...prev, { user_id: data.user_id, user_name: data.user_name }];
                    }
                    return prev;
                });
            } else {
                setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id));
            }
        };

        const unsubMessage = on('new_message', handleNewMessage as (...args: unknown[]) => void);
        const unsubTyping = on('user_typing', handleTyping as (...args: unknown[]) => void);

        return () => {
            unsubMessage();
            unsubTyping();
        };
    }, [on, selectedChatId]);

    // Join/leave channel rooms when selection changes
    useEffect(() => {
        if (selectedChatId) {
            joinChannel(selectedChatId);
            fetchMessages(selectedChatId);
            markRead(selectedChatId);
            setTypingUsers([]);
        }

        return () => {
            if (selectedChatId) {
                leaveChannel(selectedChatId);
            }
        };
    }, [selectedChatId, joinChannel, leaveChannel, markRead]);

    // Polling fallback when WebSocket is disconnected
    useEffect(() => {
        if (isConnected || !selectedChatId) return;
        const interval = setInterval(() => {
            fetchMessages(selectedChatId);
        }, 5000);
        return () => clearInterval(interval);
    }, [isConnected, selectedChatId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Search users with debounce
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.length < 1) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.users);
                    setShowSearchResults(true);
                }
            } catch (error) {
                console.error('Search failed:', error);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    // Fetch all users for group chat creation
    const fetchAllUsers = async () => {
        try {
            const res = await apiFetch('/api/users/search?q=');
            if (res.ok) {
                const data = await res.json();
                setAllUsers(data.users);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const fetchChats = async () => {
        try {
            const res = await apiFetch('/api/chats');
            if (res.ok) {
                const data = await res.json();
                setChats(data.chats);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (chatId: number) => {
        try {
            const res = await apiFetch(`/api/chats/${chatId}/messages`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleTypingInput = useCallback(() => {
        if (!selectedChatId) return;

        setTyping(selectedChatId, true);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            if (selectedChatId) {
                setTyping(selectedChatId, false);
            }
        }, 2000);
    }, [selectedChatId, setTyping]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChatId) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        setTyping(selectedChatId, false);

        if (isConnected) {
            sendMessage(selectedChatId, newMessage.trim());
            setNewMessage('');
        } else {
            apiFetch(`/api/chats/${selectedChatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newMessage.trim() })
                
            }).then(res => {
                if (res.ok) {
                    setNewMessage('');
                    fetchMessages(selectedChatId);
                } else {
                    toast.error('Failed to send message');
                }
            }).catch(() => {
                toast.error('Failed to send message');
            });
        }
    };

    const handleUserClick = async (searchUser: SearchUser) => {
        setShowSearchResults(false);
        setSearchQuery('');

        if (searchUser.existing_chat_id) {
            // Open existing chat
            setSelectedChatId(searchUser.existing_chat_id);
        } else {
            // Create new chat
            try {
                const res = await apiFetch('/api/chats/direct', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: searchUser.id })
                    
                });

                if (res.ok) {
                    const data = await res.json();
                    toast.success('Chat created!');
                    await fetchChats();
                    setSelectedChatId(data.chat_id);
                } else {
                    const err = await res.json();
                    toast.error(err.error || 'Failed to create chat');
                }
            } catch (error) {
                toast.error('Failed to create chat');
            }
        }
    };

    const handleCreateGroup = async () => {
        if (selectedUsers.length === 0) {
            toast.error('Select at least one user');
            return;
        }

        try {
            const res = await apiFetch('/api/chats/group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: groupName.trim() || undefined,
                    user_ids: selectedUsers.map(u => u.id)
                })
                
            });

            if (res.ok) {
                const data = await res.json();
                toast.success('Group chat created!');
                setShowCreateGroup(false);
                setGroupName('');
                setSelectedUsers([]);
                await fetchChats();
                setSelectedChatId(data.chat_id);
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to create group');
            }
        } catch (error) {
            toast.error('Failed to create group');
        }
    };

    const toggleUserSelection = (searchUser: SearchUser) => {
        setSelectedUsers(prev => {
            const exists = prev.find(u => u.id === searchUser.id);
            if (exists) {
                return prev.filter(u => u.id !== searchUser.id);
            } else {
                return [...prev, searchUser];
            }
        });
    };

    const openCreateGroupDialog = () => {
        fetchAllUsers();
        setShowCreateGroup(true);
    };

    const handleCreateAnnouncement = async () => {
        if (!announcementContent.trim()) {
            toast.error('Announcement content required');
            return;
        }

        try {
            const res = await apiFetch('/api/chats/announcement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: announcementTitle.trim() || undefined,
                    content: announcementContent.trim()
                })
                
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Announcement sent to ${data.recipients} recipients!`);
                setShowAnnouncement(false);
                setAnnouncementTitle('');
                setAnnouncementContent('');
                await fetchChats();
                setSelectedChatId(data.chat_id);
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to create announcement');
            }
        } catch (error) {
            toast.error('Failed to create announcement');
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
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-navy">Chats</h2>
                                {isConnected ? (
                                    <span title="Connected"><Wifi className="h-4 w-4 text-green-500" /></span>
                                ) : (
                                    <span title="Disconnected - using fallback"><WifiOff className="h-4 w-4 text-red-500" /></span>
                                )}
                            </div>
                            {isAdmin && (
                                <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => setShowAnnouncement(true)} title="New Announcement">
                                        <MessageSquare className="h-5 w-5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={openCreateGroupDialog} title="Create Group Chat">
                                        <Plus className="h-5 w-5" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Search (Admin and Captain can create chats) */}
                        {canCreateChat && (
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={isCaptain ? "Search captains..." : "Search users..."}
                                    className="pl-8 bg-background"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => searchQuery && setShowSearchResults(true)}
                                    onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                                />

                                {/* Search Results Dropdown */}
                                {showSearchResults && searchResults.length > 0 && (
                                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                        {searchResults.map(u => (
                                            <button
                                                key={u.id}
                                                className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between"
                                                onClick={() => handleUserClick(u)}
                                            >
                                                <div>
                                                    <span className="font-medium">{u.name}</span>
                                                    <span className="text-xs text-muted-foreground ml-2 capitalize">({u.role})</span>
                                                </div>
                                                {u.existing_chat_id ? (
                                                    <MessageSquare className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Plus className="h-4 w-4 text-blue-500" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="flex flex-col gap-1 p-2">
                            {loading ? (
                                <p className="text-sm text-muted-foreground p-4">Loading chats...</p>
                            ) : chats.length === 0 ? (
                                <p className="text-sm text-muted-foreground p-4">No chats yet</p>
                            ) : (
                                chats.map((chat) => (
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
                                        {(chat.type === 'game' || chat.type === 'group') && (
                                            <div className="mt-1">
                                                <span className={cn(
                                                    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold",
                                                    chat.type === 'group' ? "bg-blue-100 text-blue-800" : "bg-secondary text-secondary-foreground"
                                                )}>
                                                    {chat.type === 'group' ? 'Group' : 'Match'}
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
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
                                        <div className="text-xs text-muted-foreground capitalize">
                                            {selectedChat.type === 'game' ? 'Game Channel' :
                                                selectedChat.type === 'group' ? 'Group Chat' : 'Direct Message'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isAdmin && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            title="Delete this chat"
                                            onClick={() => setShowDeleteChat(true)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon">
                                        <Info className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                                {messages.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        No messages yet. Start the conversation!
                                    </div>
                                ) : (
                                    messages.map((msg, index) => {
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
                                    })
                                )}

                                {typingUsers.length > 0 && (
                                    <div className="text-xs text-muted-foreground italic">
                                        {typingUsers.map(u => u.user_name).join(', ')}
                                        {typingUsers.length === 1 ? ' is' : ' are'} typing...
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <Input
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value);
                                            handleTypingInput();
                                        }}
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
                                <Info className="h-12 w-12" />
                            </div>
                            <h3 className="text-lg font-medium">Select a chat to start messaging</h3>
                            {isAdmin && (
                                <p className="text-sm mt-2">Use the search bar to find users or create a group chat</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Group Dialog */}
            <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Create Group Chat
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="group-name">Group Name (optional)</Label>
                            <Input
                                id="group-name"
                                placeholder="e.g., Season Planning"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label>Select Members</Label>
                            <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg">
                                {allUsers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground p-3">Loading users...</p>
                                ) : (
                                    allUsers.map(u => (
                                        <div
                                            key={u.id}
                                            className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                                            onClick={() => toggleUserSelection(u)}
                                        >
                                            <Checkbox
                                                checked={selectedUsers.some(s => s.id === u.id)}
                                            />
                                            <div className="flex-1">
                                                <span className="font-medium">{u.name}</span>
                                                <span className="text-xs text-muted-foreground ml-2 capitalize">({u.role})</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {selectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedUsers.map(u => (
                                    <span
                                        key={u.id}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                                    >
                                        {u.name}
                                        <button onClick={() => toggleUserSelection(u)} className="hover:text-red-500">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateGroup(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateGroup} disabled={selectedUsers.length === 0}>
                            Create Group
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Announcement Dialog (Admin only) */}
            <Dialog open={showAnnouncement} onOpenChange={setShowAnnouncement}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Announcement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Announcements are sent to all captains in the league.
                        </p>
                        <div>
                            <Label htmlFor="ann-title">Title (optional)</Label>
                            <Input
                                id="ann-title"
                                placeholder="League Announcement"
                                value={announcementTitle}
                                onChange={(e) => setAnnouncementTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="ann-content">Content</Label>
                            <textarea
                                id="ann-content"
                                className="w-full min-h-[100px] px-3 py-2 border rounded-md bg-background text-sm"
                                placeholder="Enter your announcement..."
                                value={announcementContent}
                                onChange={(e) => setAnnouncementContent(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAnnouncement(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateAnnouncement} disabled={!announcementContent.trim()}>
                            Send Announcement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Chat Confirmation */}
            <AlertDialog open={showDeleteChat} onOpenChange={setShowDeleteChat}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete &quot;{selectedChat?.name}&quot; and all its messages. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                                try {
                                    const res = await apiFetch(`/api/chats/${selectedChatId}`, {
                                        method: 'DELETE'
                                        
                                    });
                                    if (res.ok) {
                                        toast.success('Chat deleted');
                                        setChats(prev => prev.filter(c => c.id !== selectedChatId));
                                        setSelectedChatId(null);
                                        setMessages([]);
                                    } else {
                                        const err = await res.json();
                                        toast.error(err.error || 'Failed to delete chat');
                                    }
                                } catch {
                                    toast.error('Failed to delete chat');
                                }
                                setShowDeleteChat(false);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
};

export default ChatPage;
