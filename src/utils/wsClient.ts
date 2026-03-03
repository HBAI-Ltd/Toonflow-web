import settingStore from "@/stores/setting";

// utils/WsClient.ts
type WsOptions = {
  timeout?: number; // 超时时间（ms）
  reconnectInterval?: number; // 重连间隔（ms）
  maxRetries?: number; // 最大重连次数
  onMessage?: (msg: string) => void;
  onOpen?: () => void;
  onClose?: (e: any) => void;
  onError?: (err: any) => void;
};

function resolveWsBaseUrl(rawValue: string): string {
  const value = (rawValue || "").trim();
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hasBrowserHost = window.location.protocol !== "file:" && window.location.origin !== "null" && !!window.location.host;
  const runtimeHost = hasBrowserHost ? window.location.host : "localhost:60000";

  if (/^wss?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.host) return value;
    } catch {
      // ignore invalid url and fallback to runtime host
    }
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.host) {
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        return url.toString();
      }
    } catch {
      // ignore invalid url and fallback to runtime host
    }
  }

  let pathPrefix = value;
  if (!pathPrefix || pathPrefix === ".") {
    pathPrefix = hasBrowserHost ? window.location.pathname : "/";
  }

  if (!pathPrefix.startsWith("/")) {
    pathPrefix = `/${pathPrefix}`;
  }

  pathPrefix = pathPrefix.replace(/\/index\.html?$/i, "/").replace(/\/+$/, "");

  return `${wsProtocol}//${runtimeHost}${pathPrefix}`;
}

class WsClient {
  public ws: WebSocket | null = null;
  private url: string;
  private options: WsOptions;
  private timer: number | null = null;
  private retries = 0;

  constructor(url: string, options: WsOptions = {}) {
    const { wsBaseUrl } = storeToRefs(settingStore());

    const baseUrl = resolveWsBaseUrl(wsBaseUrl.value);
    const normalizedPath = url.replace(/^\/+/, "");
    const fullUrl = new URL(normalizedPath, `${baseUrl.replace(/\/+$/, "")}/`);

    const token = localStorage.getItem("token");
    if (token) fullUrl.searchParams.set("token", token);
    this.url = fullUrl.toString();
    this.options = options;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      if (this.options.onOpen) this.options.onOpen();
      this.retries = 0;
    };
    this.ws.onmessage = (e) => {
      if (this.options.onMessage) this.options.onMessage(e.data);
    };
    this.ws.onerror = () => {
      this.stopTimeout();
      this.reconnect();
    };
    this.ws.onclose = (e) => {
      if (this.options.onClose) this.options.onClose(e);
      this.stopTimeout();
      // this.reconnect();
    };
  }

  private stopTimeout() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private reconnect() {
    const maxRetries = this.options.maxRetries ?? 10;
    if (this.retries < maxRetries) {
      setTimeout(() => {
        this.retries++;
        this.connect();
      }, this.options.reconnectInterval ?? 3000);
    }
  }

  send(data: object) {
    if (this.ws) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close() {
    this.stopTimeout();
    if (this.ws) this.ws.close();
  }
}

export default WsClient;
