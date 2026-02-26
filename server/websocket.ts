import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { User } from '../drizzle/schema';

export type SocketUser = {
  userId: string;
  userName: string;
  email: string;
};

export type RealtimeEvent = {
  type: 'produto_atualizado' | 'preco_atualizado' | 'pedido_criado' | 'pedido_atualizado' | 'usuario_conectado' | 'usuario_desconectado';
  userId: string;
  userName: string;
  timestamp: Date;
  data: Record<string, any>;
};

const connectedUsers = new Map<string, SocketUser>();

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] User connected: ${socket.id}`);

    // Autenticar usuário
    socket.on('authenticate', (user: User) => {
      const socketUser: SocketUser = {
        userId: String(user.id),
        userName: user.name || 'Usuário',
        email: user.email || 'unknown@example.com',
      };

      connectedUsers.set(socket.id, socketUser);

      // Notificar outros usuários
      socket.broadcast.emit('usuario_conectado', {
        userId: user.id,
        userName: user.name,
        timestamp: new Date(),
      });

      console.log(`[WebSocket] User authenticated: ${user.name} (${socket.id})`);
    });

    // Produto atualizado
    socket.on('produto_atualizado', (data: any) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const event: RealtimeEvent = {
        type: 'produto_atualizado',
        userId: user.userId,
        userName: user.userName,
        timestamp: new Date(),
        data,
      };

      socket.broadcast.emit('produto_atualizado', event);
      console.log(`[WebSocket] Produto atualizado por ${user.userName}:`, data);
    });

    // Preço atualizado
    socket.on('preco_atualizado', (data: any) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const event: RealtimeEvent = {
        type: 'preco_atualizado',
        userId: user.userId,
        userName: user.userName,
        timestamp: new Date(),
        data,
      };

      socket.broadcast.emit('preco_atualizado', event);
      console.log(`[WebSocket] Preço atualizado por ${user.userName}:`, data);
    });

    // Pedido criado
    socket.on('pedido_criado', (data: any) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const event: RealtimeEvent = {
        type: 'pedido_criado',
        userId: user.userId,
        userName: user.userName,
        timestamp: new Date(),
        data,
      };

      io.emit('pedido_criado', event);
      console.log(`[WebSocket] Pedido criado por ${user.userName}:`, data);
    });

    // Pedido atualizado
    socket.on('pedido_atualizado', (data: any) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const event: RealtimeEvent = {
        type: 'pedido_atualizado',
        userId: user.userId,
        userName: user.userName,
        timestamp: new Date(),
        data,
      };

      io.emit('pedido_atualizado', event);
      console.log(`[WebSocket] Pedido atualizado por ${user.userName}:`, data);
    });

    // Obter usuários conectados
    socket.on('get_usuarios_conectados', () => {
      const usuarios = Array.from(connectedUsers.values());
      socket.emit('usuarios_conectados', usuarios);
    });

    // Desconectar
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        connectedUsers.delete(socket.id);
        socket.broadcast.emit('usuario_desconectado', {
          userId: user.userId,
          userName: user.userName,
          timestamp: new Date(),
        });
        console.log(`[WebSocket] User disconnected: ${user.userName} (${socket.id})`);
      }
    });
  });

  return io;
}

export function getConnectedUsers() {
  return Array.from(connectedUsers.values());
}
