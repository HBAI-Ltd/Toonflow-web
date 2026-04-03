// useChat.ts
import { ref, shallowRef, onMounted, onUnmounted, computed } from "vue";
import { io, Socket } from "socket.io-client";
import type { ChatMessagesData, AIMessage, UserMessage, AIMessageContent, ChatMessageStatus } from "@tdesign-vue-next/chat";

// Socket 事件类型定义
export interface MessageEvent {
  id: string;
  role: "assistant" | "user" | "system";
  status: ChatMessageStatus;
  datetime: string;
  content: any[];
  ext?: Record<string, any>;
}

export interface MessageUpdateEvent {
  id: string;
  status?: ChatMessageStatus;
  ext?: Record<string, any>;
}

export interface ContentAddEvent {
  messageId: string;
  content: AIMessageContent;
}

export interface ContentUpdateEvent {
  messageId: string;
  contentId: string;
  type: string;
  data?: any;
  strategy?: "merge" | "append";
  status?: ChatMessageStatus;
}

export interface ChatSocketEvents {
  // 发送事件
  chat: { content: string; attachments?: any[] };
  stop: { messageId: string };
  regenerate: { messageId: string };

  // 接收事件
  message: MessageEvent;
  "message:update": MessageUpdateEvent;
  "content:add": ContentAddEvent;
  "content:update": ContentUpdateEvent;
  error: { code: string; message: string };
}

export interface UseChatOptions {
  url: string;
  auth?: Record<string, any>;
  autoConnect?: boolean;
  onError?: (error: { code: string; message: string }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useChat(options: UseChatOptions) {
  const { url, auth, autoConnect = true, onError, onConnect, onDisconnect } = options;

  const socket = shallowRef<Socket | null>(null);
  const connected = ref(false);
  const connecting = ref(false);
  const messages = ref<ChatMessagesData[]>([]);
  const currentMessageId = ref<string | null>(null);

  // 计算属性 - 修复：增加对内容流状态的判断
  const isGenerating = computed(() => {
    const lastMsg = messages.value[messages.value.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return false;

    const status = lastMsg.status;
    // pending 或 streaming 状态都算生成中
    if (status === "pending" || status === "streaming") return true;

    // 额外检查：如果消息状态是其他，但有内容块还在流式中
    const aiMsg = lastMsg as AIMessage;
    if (aiMsg.content?.some((c) => c.status === "pending" || c.status === "streaming")) {
      return true;
    }

    return false;
  });

  const lastMessage = computed(() => messages.value[messages.value.length - 1]);

  // 工具方法
  const findMessage = (id: string): ChatMessagesData | undefined => {
    return messages.value.find((m) => m.id === id);
  };

  const findMessageIndex = (id: string): number => {
    return messages.value.findIndex((m) => m.id === id);
  };

  const findContent = (msg: AIMessage, contentId: string): AIMessageContent | undefined => {
    return msg.content?.find((c) => c.id === contentId);
  };

  // 深度合并工具
  const deepMerge = <T extends Record<string, any>>(target: T, source: Partial<T>): T => {
    if (typeof source !== "object" || source === null) return source as T;

    const result: Record<string, any> = { ...target };

    for (const key in source) {
      const sourceVal = source[key];
      const targetVal = result[key];

      if (Array.isArray(sourceVal)) {
        result[key] = [...(Array.isArray(targetVal) ? targetVal : []), ...sourceVal];
      } else if (typeof sourceVal === "object" && sourceVal !== null) {
        const base = typeof targetVal === "object" && targetVal !== null ? targetVal : {};
        result[key] = deepMerge(base as Record<string, any>, sourceVal as Record<string, any>);
      } else if (sourceVal !== undefined) {
        result[key] = sourceVal;
      }
    }

    return result as T;
  };

  // 字符串追加处理
  const appendStringData = (content: AIMessageContent, delta: string) => {
    if (typeof content.data === "string") {
      content.data += delta;
    } else if (typeof content.data === "object" && content.data !== null) {
      if ("text" in content.data && typeof delta === "string") {
        (content.data as any).text = ((content.data as any).text || "") + delta;
      }
    }
  };

  // 处理内容更新的核心逻辑
  const handleContentUpdate = (event: ContentUpdateEvent) => {
    const { messageId, contentId, type, data, strategy, status } = event;

    const msg = findMessage(messageId) as AIMessage;
    if (!msg || msg.role !== "assistant") return;

    const content = findContent(msg, contentId);
    if (!content) return;

    // 更新内容状态
    if (status) {
      content.status = status;
    }

    // 关键修复：当内容块开始流式输出时，同步更新消息状态
    if (status === "streaming" || (strategy === "append" && data)) {
      if (msg.status === "pending") {
        msg.status = "streaming";
      }
    }

    // 无数据时仅更新状态
    if (data === undefined || data === null) return;

    // 根据策略处理数据
    if (strategy === "append") {
      if (typeof data === "string") {
        appendStringData(content, data);
      } else if (typeof data === "object") {
        content.data = deepMerge(content.data as any, data);
      }
    } else {
      if (typeof content.data === "object" && typeof data === "object") {
        content.data = { ...content.data, ...data };
      } else {
        content.data = data;
      }
    }

    // 流式状态（如果没有显式指定状态且是追加模式）
    if (!status && strategy === "append") {
      content.status = "streaming";
    }
  };

  // 消息处理器
  const setupHandlers = () => {
    if (!socket.value) return;

    // 新消息
    socket.value.on("message", (data: MessageEvent) => {
      const newMessage: ChatMessagesData = {
        id: data.id,
        role: data.role,
        status: data.status || "pending",
        datetime: data.datetime,
        content: data.content || [],
        ext: data.ext,
      } as ChatMessagesData;

      messages.value.push(newMessage);

      if (data.role === "assistant") {
        currentMessageId.value = data.id;
      }
    });

    // 消息状态更新
    socket.value.on("message:update", (data: MessageUpdateEvent) => {
      const msg = findMessage(data.id);
      if (!msg) return;

      if (data.status) {
        msg.status = data.status;
      }

      if (data.ext) {
        msg.ext = { ...msg.ext, ...data.ext };
      }

      if (data.status === "complete" || data.status === "error" || data.status === "stop") {
        if (currentMessageId.value === data.id) {
          currentMessageId.value = null;
        }
      }
    });

    // 添加内容块 - 修复：不要在这里改变消息状态
    socket.value.on("content:add", (data: ContentAddEvent) => {
      const msg = findMessage(data.messageId) as AIMessage;
      if (!msg || msg.role !== "assistant") return;

      if (!msg.content) {
        msg.content = [];
      }

      // 确保内容块有默认状态
      const content = {
        ...data.content,
        status: data.content.status || "pending",
      };

      msg.content.push(content);

      // 关键修复：只有当内容块状态是 streaming 时才更新消息状态
      // pending 状态的内容块表示还没有真正开始输出
      if (content.status === "streaming") {
        if (msg.status === "pending") {
          msg.status = "streaming";
        }
      }
    });

    // 内容更新（流式/完成）
    socket.value.on("content:update", handleContentUpdate);

    // 错误处理
    socket.value.on("error", (error: { code: string; message: string }) => {
      console.error("[Chat Error]", error);
      onError?.(error);
    });

    // 连接事件
    socket.value.on("connect", () => {
      connected.value = true;
      connecting.value = false;
      onConnect?.();
    });

    socket.value.on("disconnect", (reason) => {
      connected.value = false;
      connecting.value = false;
      onDisconnect?.();
      console.log("[Chat Disconnected]", reason);
    });

    socket.value.on("connect_error", (error) => {
      connected.value = false;
      connecting.value = false;
      console.error("[Chat Connect Error]", error);
    });
  };

  // 连接管理
  const connect = () => {
    if (socket.value?.connected || connecting.value) return;

    connecting.value = true;

    if (!socket.value) {
      socket.value = io(url, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        auth: { token: localStorage.getItem("token"), ...auth },
      });

      setupHandlers();
    } else {
      socket.value.connect();
    }
  };

  const disconnect = () => {
    socket.value?.disconnect();
    connected.value = false;
    connecting.value = false;
  };

  const reconnect = () => {
    disconnect();
    setTimeout(connect, 100);
  };

  // 发送方法
  const emit = <E extends keyof ChatSocketEvents & string>(event: E, data?: ChatSocketEvents[E]) => {
    if (!socket.value?.connected) {
      console.warn("[Chat] Socket not connected");
      return false;
    }
    socket.value.emit(event, data);
    return true;
  };

  // 监听方法
  const on = <E extends keyof ChatSocketEvents & string>(event: E, callback: (data: ChatSocketEvents[E]) => void) => {
    socket.value?.on(event, callback as any);
    return () => socket.value?.off(event, callback as any);
  };

  const once = <E extends keyof ChatSocketEvents & string>(event: E, callback: (data: ChatSocketEvents[E]) => void) => {
    socket.value?.once(event, callback as any);
  };

  const off = <E extends keyof ChatSocketEvents & string>(event: E, callback?: (data: ChatSocketEvents[E]) => void) => {
    socket.value?.off(event, callback as any);
  };

  // 业务方法
  const chat = (content: string, attachments?: any[]) => {
    if (!content.trim() && !attachments?.length) return false;

    const userMessage: UserMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      status: "complete",
      datetime: new Date().toISOString(),
      content: [{ type: "text", data: content, status: "complete" }],
    };

    if (attachments?.length) {
      userMessage.content.push({
        type: "attachment",
        data: attachments,
        status: "complete",
      });
    }

    messages.value.push(userMessage);

    return emit("chat", { content, attachments });
  };

  const stopGenerate = (messageId?: string) => {
    const id = messageId || currentMessageId.value;
    if (!id) return false;

    return emit("stop", { messageId: id });
  };

  const regenerate = (messageId: string) => {
    return emit("regenerate", { messageId });
  };

  // 消息管理
  const clearMessages = () => {
    messages.value = [];
    currentMessageId.value = null;
  };

  const removeMessage = (id: string) => {
    const idx = findMessageIndex(id);
    if (idx > -1) {
      messages.value.splice(idx, 1);
    }
  };

  const removeMessagesAfter = (id: string) => {
    const idx = findMessageIndex(id);
    if (idx > -1) {
      messages.value.splice(idx + 1);
    }
  };

  const updateMessage = (id: string, updates: Partial<ChatMessagesData>) => {
    const msg = findMessage(id);
    if (msg) {
      Object.assign(msg, updates);
    }
  };

  const getContentByType = <T extends AIMessageContent["type"]>(messageId: string, type: T): Extract<AIMessageContent, { type: T }>[] => {
    const msg = findMessage(messageId) as AIMessage;
    if (!msg || msg.role !== "assistant") return [];
    return (msg.content?.filter((c) => c.type === type) || []) as Extract<AIMessageContent, { type: T }>[];
  };

  // 生命周期
  onMounted(() => {
    if (autoConnect) connect();
  });

  onUnmounted(() => {
    disconnect();
    socket.value?.removeAllListeners();
    socket.value = null;
  });

  return {
    socket,
    connected,
    connecting,
    messages,
    currentMessageId,
    isGenerating,
    lastMessage,
    connect,
    disconnect,
    reconnect,
    emit,
    on,
    once,
    off,
    chat,
    stopGenerate,
    regenerate,
    clearMessages,
    removeMessage,
    removeMessagesAfter,
    updateMessage,
    findMessage,
    getContentByType,
  };
}

export type UseChatReturn = ReturnType<typeof useChat>;
