import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
    autoConnect?: boolean;
}

interface SocketState {
    isConnected: boolean;
    roomsJoined: number;
}

export function useSocket(options: UseSocketOptions = { autoConnect: true }) {
    const socketRef = useRef<Socket | null>(null);
    const [state, setState] = useState<SocketState>({
        isConnected: false,
        roomsJoined: 0
    });
    // Track when socket is ready so callbacks re-bind
    const [socketReady, setSocketReady] = useState(false);

    useEffect(() => {
        if (!options.autoConnect) return;

        // Create socket connection with credentials
        const socket = io('/', {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            autoConnect: true
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Socket] Connected');
            setSocketReady(true);
        });

        socket.on('connected', (data: { user_id: number; rooms_joined: number }) => {
            setState({
                isConnected: true,
                roomsJoined: data.rooms_joined
            });
            console.log(`[Socket] Authenticated, joined ${data.rooms_joined} rooms`);
        });

        socket.on('disconnect', () => {
            setState(prev => ({ ...prev, isConnected: false }));
            setSocketReady(false);
            console.log('[Socket] Disconnected');
        });

        socket.on('error', (error: { message: string }) => {
            console.error('[Socket] Error:', error.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
            setSocketReady(false);
        };
    }, [options.autoConnect]);

    // Include socketReady in deps so these re-bind once the socket is live
    const emit = useCallback((event: string, data?: unknown) => {
        socketRef.current?.emit(event, data);
    }, [socketReady]);

    const on = useCallback((event: string, callback: (...args: unknown[]) => void) => {
        socketRef.current?.on(event, callback);
        return () => {
            socketRef.current?.off(event, callback);
        };
    }, [socketReady]);

    const off = useCallback((event: string, callback?: (...args: unknown[]) => void) => {
        if (callback) {
            socketRef.current?.off(event, callback);
        } else {
            socketRef.current?.off(event);
        }
    }, [socketReady]);

    const joinChannel = useCallback((channelId: number) => {
        emit('join_channel', { channel_id: channelId });
    }, [emit]);

    const leaveChannel = useCallback((channelId: number) => {
        emit('leave_channel', { channel_id: channelId });
    }, [emit]);

    const sendMessage = useCallback((channelId: number, content: string) => {
        emit('send_message', { channel_id: channelId, content });
    }, [emit]);

    const setTyping = useCallback((channelId: number, isTyping: boolean) => {
        emit('typing', { channel_id: channelId, is_typing: isTyping });
    }, [emit]);

    const markRead = useCallback((channelId: number) => {
        emit('mark_read', { channel_id: channelId });
    }, [emit]);

    return {
        socket: socketRef.current,
        isConnected: state.isConnected,
        roomsJoined: state.roomsJoined,
        emit,
        on,
        off,
        joinChannel,
        leaveChannel,
        sendMessage,
        setTyping,
        markRead
    };
}
