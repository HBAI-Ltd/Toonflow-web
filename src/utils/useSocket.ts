import { ref } from "vue";
import { io, Socket } from "socket.io-client";

export function useSocket(url = "http://localhost:60000") {
  let socket: Socket | null = null;
  const connected = ref(false);

  const connect = () => {
    if (socket?.connected) return;
    socket = io(url, { transports: ["websocket", "polling"] });
    socket.on("connect", () => (connected.value = true));
    socket.on("disconnect", () => (connected.value = false));
  };

  const disconnect = () => {
    socket?.disconnect();
    socket = null;
    connected.value = false;
  };

  const emit = (event: string, ...args: unknown[]) => {
    socket?.emit(event, ...args);
  };

  const on = (event: string, callback: (...args: any[]) => void) => {
    socket?.on(event, callback);
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    socket?.off(event, callback);
  };

  return { connected, connect, disconnect, emit, on, off };
}
