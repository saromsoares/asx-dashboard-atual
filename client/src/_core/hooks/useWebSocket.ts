import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

export type RealtimeEvent = {
  type: 'produto_atualizado' | 'preco_atualizado' | 'pedido_criado' | 'pedido_atualizado' | 'usuario_conectado' | 'usuario_desconectado';
  userId: string;
  userName: string;
  timestamp: Date;
  data: Record<string, any>;
};

type EventCallback = (event: RealtimeEvent) => void;

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();
  const callbacksRef = useRef<Map<string, EventCallback[]>>(new Map());

  // Conectar ao WebSocket
  useEffect(() => {
    if (!user) return;

    // Conectar ao servidor WebSocket
    const socket = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Conectado ao servidor');
      // Autenticar usuário
      socket.emit('authenticate', user);
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Desconectado do servidor');
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Erro de conexão:', error);
    });

    // Registrar listeners para eventos
    socket.on('produto_atualizado', (event: RealtimeEvent) => {
      triggerCallbacks('produto_atualizado', event);
    });

    socket.on('preco_atualizado', (event: RealtimeEvent) => {
      triggerCallbacks('preco_atualizado', event);
    });

    socket.on('pedido_criado', (event: RealtimeEvent) => {
      triggerCallbacks('pedido_criado', event);
    });

    socket.on('pedido_atualizado', (event: RealtimeEvent) => {
      triggerCallbacks('pedido_atualizado', event);
    });

    socket.on('usuario_conectado', (event: any) => {
      console.log(`[WebSocket] Usuário conectado: ${event.userName}`);
      triggerCallbacks('usuario_conectado', event);
    });

    socket.on('usuario_desconectado', (event: any) => {
      console.log(`[WebSocket] Usuário desconectado: ${event.userName}`);
      triggerCallbacks('usuario_desconectado', event);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const triggerCallbacks = (eventType: string, event: RealtimeEvent) => {
    const callbacks = callbacksRef.current.get(eventType) || [];
    callbacks.forEach(callback => callback(event));
  };

  // Emitir evento
  const emit = useCallback((eventType: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(eventType, data);
    } else {
      console.warn('[WebSocket] Socket não está conectado');
    }
  }, []);

  // Registrar callback para evento
  const on = useCallback((eventType: string, callback: EventCallback) => {
    if (!callbacksRef.current.has(eventType)) {
      callbacksRef.current.set(eventType, []);
    }
    callbacksRef.current.get(eventType)!.push(callback);

    // Retornar função para remover callback
    return () => {
      const callbacks = callbacksRef.current.get(eventType) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }, []);

  // Obter usuários conectados
  const getUsuariosConectados = useCallback(() => {
    return new Promise<any[]>((resolve) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('get_usuarios_conectados');
        socketRef.current.once('usuarios_conectados', (usuarios) => {
          resolve(usuarios);
        });
      } else {
        resolve([]);
      }
    });
  }, []);

  return {
    isConnected: socketRef.current?.connected ?? false,
    emit,
    on,
    getUsuariosConectados,
  };
}
