import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * SocketService — Singleton service responsible for the WebSocket connection.
 * Encapsulates socket.io-client logic away from the React layer.
 */
class SocketService {
  public socket: Socket | null = null;

  connectSocket(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'], // Production-ready: forces WebSocket transport
      reconnection: true,
    });
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();