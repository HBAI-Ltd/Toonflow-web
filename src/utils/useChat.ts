// useChat.ts
import { ref, shallowRef, onMounted, onUnmounted, computed } from "vue";
import { io, Socket } from "socket.io-client";
import sax from "sax";
import type { ChatMessagesData, AIMessage, UserMessage, AIMessageContent, ChatMessageStatus } from "@tdesign-vue-next/chat";

// Socket 事件类型定义
export interface MessageEvent {
  id: string;
  role: "assistant" | "user" | "system";
  name?: string;
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

export interface XmlChildItem {
  tag: string;
  attrs: Record<string, string>;
  value: string;
}

export interface XmlTagEvent {
  messageId: string;
  contentId?: string;
  type: "text" | "markdown";
  tag: string;
  value: string;
  attrs: Record<string, string>;
  children: XmlChildItem[];
  status: ChatMessageStatus;
}

export interface XmlTagOption {
  tag: string;
  keepInMessage?: boolean;
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
  xmlTags?: Array<string | XmlTagOption>;
  keepXmlInMessage?: boolean;
  onXmlTag?: (event: XmlTagEvent) => void;
  onError?: (error: { code: string; message: string }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  manageLifecycle?: boolean;
}

export function useChat(options: UseChatOptions) {
  const { url, auth, autoConnect = true, xmlTags = [], keepXmlInMessage = true, onXmlTag, onError, onConnect, onDisconnect, manageLifecycle = true } = options;

  const socket = shallowRef<Socket | null>(null);
  const connected = ref(false);
  const connecting = ref(false);
  const messages = ref<ChatMessagesData[]>([]);
  const currentMessageId = ref<string | null>(null);
  const status = ref<"idle" | "pending" | "streaming">("idle");
  const xmlData = ref<Record<string, string>>({});
  const xmlDataByMessage = ref<Record<string, Record<string, string>>>({});
  const normalizedXmlTagOptions = Array.from(
    new Map(
      xmlTags
        .map((item) => (typeof item === "string" ? { tag: item } : item))
        .filter((item): item is XmlTagOption => Boolean(item?.tag))
        .map((item) => [item.tag, item]),
    ).values(),
  );
  const normalizedXmlTags = normalizedXmlTagOptions.map((item) => item.tag);
  const hiddenXmlTags = normalizedXmlTagOptions.filter((item) => item.keepInMessage ?? keepXmlInMessage ? false : true).map((item) => item.tag);
  const emittedXmlState = new Map<string, Record<string, string>>();
  const rawContentState = new Map<string, string>();

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

  const isXmlTextContent = (content: AIMessageContent): content is Extract<AIMessageContent, { type: "text" | "markdown" }> => {
    return (content.type === "text" || content.type === "markdown") && typeof content.data === "string";
  };

  const getContentKey = (messageId: string, content: Pick<AIMessageContent, "id" | "type">) => `${messageId}:${content.id ?? content.type}`;

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const parseXmlAttributes = (tagStr: string): Record<string, string> => {
    const attrs: Record<string, string> = {};
    const attrRegex = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(tagStr)) !== null) {
      attrs[match[1]] = match[2] ?? match[3];
    }
    return attrs;
  };

  const parseXmlChildren = (content: string): XmlChildItem[] => {
    const children: XmlChildItem[] = [];
    // 用 sax 解析子元素（仅取第一层）
    const wrappedXml = `<root>${content}</root>`;
    const parser = sax.parser(true, { trim: false });
    let depth = 0;
    let currentChild: { tag: string; attrs: Record<string, string>; text: string } | null = null;
    let innerDepth = 0;
    let innerXml = "";

    let pendingOpenTag = false;

    parser.onopentag = (node) => {
      if (pendingOpenTag && currentChild) {
        innerXml += ">";
        pendingOpenTag = false;
      }
      depth++;
      if (depth === 2) {
        currentChild = { tag: node.name, attrs: node.attributes as Record<string, string>, text: "" };
        innerDepth = 0;
        innerXml = "";
      } else if (depth > 2 && currentChild) {
        innerDepth++;
        const attrStr = Object.entries(node.attributes).map(([k, v]) => `${k}="${v}"`).join(" ");
        innerXml += `<${node.name}${attrStr ? " " + attrStr : ""}`;
        pendingOpenTag = true;
      }
    };

    parser.onclosetag = (tagName) => {
      if (depth === 2 && currentChild) {
        currentChild.text = innerXml || currentChild.text;
        children.push({ tag: currentChild.tag, attrs: currentChild.attrs, value: currentChild.text });
        currentChild = null;
      } else if (depth > 2 && currentChild) {
        innerDepth--;
        if (pendingOpenTag) {
          innerXml += " />";
          pendingOpenTag = false;
        } else {
          innerXml += `</${tagName}>`;
        }
      }
      depth--;
    };

    parser.ontext = (text) => {
      if (pendingOpenTag && currentChild) {
        innerXml += ">";
        pendingOpenTag = false;
      }
      if (depth === 2 && currentChild) {
        currentChild.text += text;
      } else if (depth > 2 && currentChild) {
        innerXml += text;
      }
    };

    // 流式场景下 XML 可能不完整，sax 报错时继续解析
    parser.onerror = () => {
      parser.error = null as any;
      parser.resume();
    };

    try {
      parser.write(wrappedXml).close();
    } catch {
      // 忽略解析错误，已解析到的 children 保留
    }

    // 流式场景：如果有未闭合的子元素，也加入结果
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if ((currentChild as typeof currentChild) != null) {
      const c = currentChild!;
      c.text = innerXml || c.text;
      children.push({ tag: c.tag, attrs: c.attrs, value: c.text });
    }

    return children;
  };

  const parseXmlTag = (text: string, tag: string) => {
    const escapedTag = escapeRegExp(tag);
    // Match opening tag with optional attributes: <tag> or <tag attr="val">
    const openRegex = new RegExp(`<${escapedTag}(\\s[^>]*)?>`, "g");
    let lastMatch: RegExpExecArray | null = null;
    let m: RegExpExecArray | null;
    while ((m = openRegex.exec(text)) !== null) {
      lastMatch = m;
    }
    if (!lastMatch) return null;

    const attrs = parseXmlAttributes(lastMatch[1] ?? "");
    const contentStart = lastMatch.index + lastMatch[0].length;
    const closeTag = `</${tag}>`;
    const closeIndex = text.indexOf(closeTag, contentStart);
    const isComplete = closeIndex !== -1;
    const value = text.slice(contentStart, isComplete ? closeIndex : text.length).trim();
    const children = parseXmlChildren(value);

    return {
      value,
      attrs,
      children,
      isComplete,
    };
  };

  const stripXmlFromMessage = (text: string) => {
    let sanitized = text;

    for (const tag of hiddenXmlTags) {
      const escapedTag = escapeRegExp(tag);
      // Match tags with or without attributes
      sanitized = sanitized.replace(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${escapedTag}>`, "g"), "");
      sanitized = sanitized.replace(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>[\\s\\S]*$`, "g"), "");
    }

    return sanitized;
  };

  const getRawContentData = (messageId: string, content: AIMessageContent) => {
    if (!isXmlTextContent(content)) return null;
    return rawContentState.get(getContentKey(messageId, content)) ?? content.data;
  };

  const syncContentDisplay = (messageId: string, content: AIMessageContent) => {
    if (!isXmlTextContent(content)) return;
    const rawText = getRawContentData(messageId, content) ?? "";
    content.data = hiddenXmlTags.length ? stripXmlFromMessage(rawText) : rawText;
  };

  const syncXmlData = (messageId: string, content: AIMessageContent, messageStatus?: ChatMessageStatus) => {
    if (!normalizedXmlTags.length) return;
    if (!isXmlTextContent(content)) return;

    const contentKey = getContentKey(messageId, content);
    const prevState = emittedXmlState.get(contentKey) ?? {};
    const nextState = { ...prevState };
    const nextMessageData = { ...(xmlDataByMessage.value[messageId] ?? {}) };
    const status = content.status ?? messageStatus ?? "pending";
    const rawText = getRawContentData(messageId, content);

    if (rawText === null) return;

    let changed = false;

    for (const tag of normalizedXmlTags) {
      const parsed = parseXmlTag(rawText, tag);
      if (parsed === null) continue;

      const { value, isComplete } = parsed;
      const eventStatus = isComplete ? status === "error" || status === "stop" ? status : "complete" : status;

      const shouldEmit = prevState[tag] !== value || eventStatus === "complete";
      if (!shouldEmit) continue;

      nextState[tag] = value;
      nextMessageData[tag] = value;
      xmlData.value = { ...xmlData.value, [tag]: value };
      changed = true;

      onXmlTag?.({
        messageId,
        contentId: content.id,
        type: content.type,
        tag,
        value,
        attrs: parsed.attrs,
        children: parsed.children,
        status: eventStatus,
      });
    }

    if (!changed) return;

    emittedXmlState.set(contentKey, nextState);
    xmlDataByMessage.value = {
      ...xmlDataByMessage.value,
      [messageId]: nextMessageData,
    };
  };

  const syncMessageXmlData = (messageId: string, message: ChatMessagesData | undefined, messageStatus?: ChatMessageStatus) => {
    if (!message || message.role !== "assistant") return;

    const aiMessage = message as AIMessage;
    aiMessage.content?.forEach((content) => syncXmlData(messageId, content, messageStatus ?? aiMessage.status));
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
    const { messageId, contentId, type, data, strategy, status: eventStatus } = event;

    const msg = findMessage(messageId) as AIMessage;
    if (!msg || msg.role !== "assistant") return;

    const content = findContent(msg, contentId);
    if (!content) return;

    // 更新内容状态
    if (eventStatus) {
      content.status = eventStatus;
    }

    // 关键修复：当内容块开始流式输出时，同步更新消息状态
    if (eventStatus === "streaming" || (strategy === "append" && data)) {
      if (msg.status === "pending") {
        msg.status = "streaming";
      }
      if (currentMessageId.value === messageId) {
        status.value = "streaming";
      }
    }

    // 无数据时仅更新状态
    if (data === undefined || data === null) {
      syncXmlData(messageId, content, msg.status);
      return;
    }

    // 根据策略处理数据
    if (isXmlTextContent(content) && typeof data === "string") {
      const contentKey = getContentKey(messageId, content);
      const previousRaw = rawContentState.get(contentKey) ?? content.data;
      const nextRaw = strategy === "append" ? previousRaw + data : data;

      rawContentState.set(contentKey, nextRaw);
      syncContentDisplay(messageId, content);
    } else if (strategy === "append") {
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
    if (!eventStatus && strategy === "append") {
      content.status = "streaming";
    }

    syncXmlData(messageId, content, msg.status);
  };

  // 消息处理器
  const setupHandlers = () => {
    if (!socket.value) return;

    // 新消息
    socket.value.on("message", (data: MessageEvent) => {
      const newMessage: ChatMessagesData = {
        id: data.id,
        role: data.role,
        name: data.name,
        status: data.status || "pending",
        datetime: data.datetime,
        content: data.content || [],
        ext: data.ext,
      } as ChatMessagesData;

      if (data.role === "assistant") {
        const aiMessage = newMessage as AIMessage;
        aiMessage.content?.forEach((content) => {
          if (!isXmlTextContent(content)) return;
          rawContentState.set(getContentKey(data.id, content), content.data);
          syncContentDisplay(data.id, content);
        });
      }

      messages.value.push(newMessage);

      if (data.role === "assistant") {
        const aiMessage = newMessage as AIMessage;
        aiMessage.content?.forEach((content) => syncXmlData(data.id, content, aiMessage.status));
      }

      if (data.role === "assistant") {
        currentMessageId.value = data.id;
        status.value = data.status === "streaming" ? "streaming" : "pending";
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

      if (data.status) {
        syncMessageXmlData(data.id, msg, data.status);
      }

      if (data.status === "streaming") {
        status.value = "streaming";
      }

      if (data.status === "complete" || data.status === "error" || data.status === "stop") {
        if (currentMessageId.value === data.id) {
          currentMessageId.value = null;
          status.value = "idle";
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
        // thinking 内容块默认折叠
        ...(data.content.type === "thinking" ? { ext: { collapsed: true, ...data.content.ext } } : {}),
      };

      if (isXmlTextContent(content)) {
        rawContentState.set(getContentKey(data.messageId, content), content.data);
        syncContentDisplay(data.messageId, content);
      }

      // thinking 内容块需要放在 content 最前面，但如果最前面已经是 thinking 则放在其后
      if (content.type === "thinking") {
        const firstNonThinkingIndex = msg.content.findIndex((c: any) => c.type !== "thinking");
        if (firstNonThinkingIndex === -1) {
          msg.content.push(content);
        } else {
          msg.content.splice(firstNonThinkingIndex, 0, content);
        }
      } else {
        msg.content.push(content);
      }
      syncXmlData(data.messageId, content, msg.status);

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
    status.value = "idle";
    xmlData.value = {};
    xmlDataByMessage.value = {};
    emittedXmlState.clear();
    rawContentState.clear();
  };

  const removeMessage = (id: string) => {
    const idx = findMessageIndex(id);
    if (idx > -1) {
      const msg = messages.value[idx] as AIMessage | undefined;
      msg?.content?.forEach((content) => {
        emittedXmlState.delete(getContentKey(id, content));
        rawContentState.delete(getContentKey(id, content));
      });
      const nextByMessage = { ...xmlDataByMessage.value };
      delete nextByMessage[id];
      xmlDataByMessage.value = nextByMessage;
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
  if (manageLifecycle) {
    onMounted(() => {
      if (autoConnect) connect();
    });

    onUnmounted(() => {
      disconnect();
      socket.value?.removeAllListeners();
      socket.value = null;
    });
  } else if (autoConnect) {
    connect();
  }

  return {
    socket,
    connected,
    connecting,
    status,
    messages,
    currentMessageId,
    xmlData,
    xmlDataByMessage,
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
