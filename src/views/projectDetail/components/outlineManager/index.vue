<template>
  <div class="contentWrap">
    <div class="conversation">
      <chat
        ref="chatRef"
        showClearBtn
        autoScroll
        v-model="messageList"
        enterToSend
        :canSend="canSend"
        @clean="handleCleanHistory"
        :sendApi="sendMsg"
        style="height: 100%"></chat>
    </div>
    <div class="workspace">
      <t-tabs v-model="activeKey">
        <t-tab-panel value="storyline" label="故事线">
          <storylineDom v-model="storyLine" v-if="activeKey == 'storyline'" @save="saveStoryLine"></storylineDom>
        </t-tab-panel>
        <t-tab-panel value="outline" label="大纲">
          <outlineDom ref="outlineDomRef" v-model="outline" v-if="activeKey == 'outline'"></outlineDom>
        </t-tab-panel>
      </t-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { MessagePlugin } from "tdesign-vue-next";
import { v4 as uuidv4 } from "uuid";
import store from "@/stores";
import outlineDom from "./components/outline.vue";
import storylineDom from "./components/storyline.vue";
import chat from "@/components/chat/index.vue";
import WsClient from "@/utils/wsClient";
import axios from "@/utils/axios";
const { projectId } = storeToRefs(store());

const chatHistory = ref<Record<number, ChatMessage[]>>({});

// ==================== 类型定义 ====================
type AgentType = "AI1" | "AI2" | "director" | "main";
// ==================== 常量定义 ====================
const AI_MSG_IDENTITY: Record<AgentType, string> = {
  AI1: "故事师",
  AI2: "大纲师",
  director: "导演",
  main: "助手",
};

// Tool 名称映射为可读文本
const TOOL_NAME_MAP: Record<string, string> = {
  AI1: "调用故事师",
  AI2: "调用大纲师",
  director: "调用导演",
  getChapter: "获取章节内容",
  getStoryline: "获取故事线",
  saveStoryline: "保存故事线",
  deleteStoryline: "删除故事线",
  getOutline: "获取大纲",
  saveOutline: "保存大纲",
  updateOutline: "更新大纲",
  deleteOutline: "删除大纲",
  generateAssets: "生成资产",
};
// ==================== Store & Route ====================
// ==================== 响应式数据 ====================
const activeKey = ref("storyline");
const storyLine = ref("");
const outline = ref([]);
const originalList = ref([]);
const selectChapterShow = ref(false);
const selectedChapters = ref([]);
const originalTextTableRef = ref();
const outlineDomRef = ref();
const chatRef = ref();

const canSend = ref(true);
// 统一的流式消息状态管理
interface StreamState {
  msgId: string | null; // 当前流式消息ID
  source: "main" | AgentType | null; // 消息来源
}
const streamState: StreamState = {
  msgId: null,
  source: null,
};

// 结束当前流式消息（切换前调用）
function endCurrentStream() {
  streamState.msgId = null;
  streamState.source = null;
}

// 创建或获取流式消息
function getOrCreateStreamMessage(source: "main" | AgentType, role: string): string {
  // 如果来源不同，先结束当前消息
  if (streamState.source !== source) {
    endCurrentStream();
  }

  // 如果没有当前消息，创建新的
  if (!streamState.msgId) {
    removeThinkingMessage();
    streamState.msgId = uuidv4();
    streamState.source = source;
    messageList.value.push({
      id: streamState.msgId,
      identity: "assistant",
      role,
      data: [{ type: "text", text: "" }],
    });
  }

  return streamState.msgId;
}

// 追加文本到当前流式消息
function appendToStream(text: string) {
  if (!streamState.msgId || !text) return;

  const msg = messageList.value.find((m) => m.id === streamState.msgId);
  if (msg && Array.isArray(msg.data) && msg.data[0] && "text" in msg.data[0]) {
    msg.data[0].text += text;
    // 流式更新时触发智能滚动
    chatRef.value?.smartScrollBottom();
  }
}

const messageList = computed(() => {
  const history = chatHistory.value[projectId.value];
  if (!history || history.length == 0) {
    chatHistory.value[projectId.value] = [
      {
        id: uuidv4(),
        identity: "assistant",
        role: "助手",
        data: [{ type: "text", text: "欢迎使用Toonflow!请选择小说后开始AI对话来生成小说故事线与大纲。如您需要我开始为您工作您可以跟我说开始" }],
      },
    ];
  }
  return chatHistory.value[projectId.value];
});
async function getHistoryMessage() {
  chatHistory.value[projectId.value] = [];
  // const res = await axios.post("/outline/getHistory", { projectId: projectId.value });
  // chatHistory.value[projectId.value] = res.data.data;
}
async function setHistoryMessage() {
  const res = await axios.post("/outline/setHistory", { projectId: projectId.value, data: JSON.stringify(chatHistory.value[projectId.value]) });
}
let ws: WsClient | null = null;
let pendingMessage: any = null; // 等待发送的消息（等待 init 完成后发送）
let wsInitialized = false; // WebSocket 是否已初始化完成（收到 init 消息）
// ==================== 小说相关 ====================
// ==================== 故事线相关 ====================
async function getStoryLine() {
  const res = await axios.post("/outline/getStoryline", { projectId: projectId.value });
  storyLine.value = res.data?.content;
}
async function saveStoryLine() {
  try {
    await axios.post("/outline/updateStoryline", {
      projectId: projectId.value,
      content: storyLine.value,
    });
    await getStoryLine();
    window.$message.success("保存成功");
  } catch (e) {
    window.$message.error("保存失败");
  }
}
// ==================== WebSocket相关 ====================
function initWsClient() {
  ws = new WsClient(`/outline/agentsOutline?projectId=${projectId.value}`, {
    onOpen: () => {
      console.log("WebSocket 连接已建立，等待后端 init 消息...");
      // 不再在这里发送消息，等待收到 init 消息后再发送
    },
    onMessage: handleWsMessage,
    onError: handleWsError,
    onClose: () => {
      canSend.value = true;
      wsInitialized = false;
      pendingMessage = null;
      ws = null;
    },
  });
}
function handleWsMessage(msg: string) {
  let msgData: any;
  try {
    msgData = JSON.parse(msg);
  } catch (e) {
    console.error("WebSocket 消息 JSON 解析失败:", e, msg);
    pushNoticeMessage("消息格式错误");
    return;
  }

  try {
    // 只有 AI 响应相关的消息才移除 thinking 消息
    const responseTypes = ["stream", "response", "response_end", "subAgentStream", "subAgentEnd"];
    if (responseTypes.includes(msgData.type)) {
      removeThinkingMessage();
    }

    const messageHandlers: Record<string, (data: any) => void> = {
      // 初始化完成
      init: () => {
        console.log("WebSocket 初始化完成");
        wsInitialized = true;
        // 如果有待发送的消息，现在发送
        if (pendingMessage) {
          console.log("发送待处理的消息:", pendingMessage);
          ws?.send(pendingMessage);
          pendingMessage = null;
        }
      },
      // 主 Agent 流式传输
      stream: (data) => handleStreamData(data.data),
      // 主 Agent 响应结束
      response_end: () => {
        canSend.value = true;
        endCurrentStream();
        // setHistoryMessage();
      },
      // Sub-Agent 流式传输
      subAgentStream: (data) => handleSubAgentStream(data.data),
      // Sub-Agent 结束
      subAgentEnd: (data) => handleSubAgentEnd(data.data),
      // Tool 调用
      toolCall: (data) => handleToolCall(data.data),
      // Agent 切换
      transfer: (data) => {
        const to = data.data?.to as AgentType;
        // 结束当前流式消息
        endCurrentStream();
        pushNoticeMessage(`${AI_MSG_IDENTITY[to] || to} 正在思考`);
      },
      setNovelDone: (data) => pushAssistantMessage("助手", data.data),
      notice: (data) => pushNoticeMessage(data.data),
      error: (data) => {
        canSend.value = true;
        pushNoticeMessage(`错误:${data.data}`);
      },
      refresh: ({ data }) => {
        if (data == "storyline") getStoryLine();
        if (data == "outline") outlineDomRef.value?.getData();
      },
    };
    const handler = messageHandlers[msgData.type];
    if (handler) {
      handler(msgData);
    } else {
      console.warn("未知的消息类型:", msgData.type, msgData);
    }
  } catch (e) {
    console.error("ws 消息处理异常:", e, msgData);
    pushNoticeMessage("消息处理失败");
  }
}
// 处理主 Agent 流式数据
function handleStreamData(text: string) {
  if (!text) return;
  getOrCreateStreamMessage("main", "助手");
  appendToStream(text);
}

// 处理 Sub-Agent 流式数据
function handleSubAgentStream(data: { agent: AgentType; text: string }) {
  if (!data.text) return;
  const role = AI_MSG_IDENTITY[data.agent] || "助手";
  getOrCreateStreamMessage(data.agent, role);
  appendToStream(data.text);
}

// 处理 Sub-Agent 结束
function handleSubAgentEnd(data: { agent: AgentType }) {
  const role = AI_MSG_IDENTITY[data.agent] || "助手";

  // 结束当前流式消息
  endCurrentStream();

  // 特殊处理：故事师和大纲师完成后显示提示
  if (data.agent === "AI1") {
    pushNoticeMessage(`${role}已完成，故事线已更新至右侧面板`);
    getStoryLine();
    activeKey.value = "storyline";
  } else if (data.agent === "AI2") {
    pushNoticeMessage(`${role}已完成，大纲已更新至右侧面板`);
    outlineDomRef.value?.getData();
    activeKey.value = "outline";
  }
}

// 处理 Tool 调用
function handleToolCall(data: { agent: AgentType | "main"; name: string; args: any }) {
  // Tool 调用前结束当前流式消息
  endCurrentStream();

  const agentName = data.agent === "main" ? "助手" : AI_MSG_IDENTITY[data.agent as AgentType] || data.agent;
  const toolName = TOOL_NAME_MAP[data.name] || data.name;

  // 构建参数描述
  let argsDesc = "";
  if (data.args) {
    if (data.name === "getChapter" && data.args.chapterNumbers) {
      argsDesc = `章节 ${data.args.chapterNumbers.join(", ")}`;
    } else if (data.name === "getOutline" && data.args.simplified !== undefined) {
      argsDesc = data.args.simplified ? "(简化版)" : "(完整版)";
    } else if (data.name === "updateOutline" && data.args.id) {
      argsDesc = `大纲ID: ${data.args.id}`;
    } else if (data.name === "deleteOutline" && data.args.ids) {
      argsDesc = `ID: ${data.args.ids.join(", ")}`;
    } else if (["AI1", "AI2", "director"].includes(data.name) && data.args.taskDescription) {
      // 调用 sub-agent 时只显示简短描述
      argsDesc = data.args.taskDescription.length > 50 ? data.args.taskDescription.substring(0, 50) + "..." : data.args.taskDescription;
    }
  }

  const message = argsDesc ? `🔧 ${agentName}正在${toolName}：${argsDesc}` : `🔧 ${agentName}正在${toolName}`;
  pushNoticeMessage(message);
}
function handleWsError(err: Error) {
  canSend.value = true;
  pushNoticeMessage("WebSocket连接异常,请重试");
  ws = null;
}
function sendWs(data: any) {
  if (!ws || ws.ws?.readyState !== WebSocket.OPEN) {
    // WebSocket 未连接，先初始化，消息存入待发送队列等待 init 完成后发送
    pendingMessage = data;
    wsInitialized = false;
    initWsClient();
  } else if (!wsInitialized) {
    // WebSocket 已连接但未初始化完成，消息存入待发送队列
    pendingMessage = data;
  } else {
    // WebSocket 已连接且已初始化，直接发送
    ws.send(data);
  }
}
// ==================== 消息处理 ====================
function pushAssistantMessage(role: string, text: string) {
  messageList.value.push({
    id: uuidv4(),
    identity: "assistant",
    role,
    data: [{ type: "text", text }],
  });
}
function pushNoticeMessage(data: string) {
  messageList.value.push({
    id: uuidv4(),
    identity: "notice",
    data,
  });
}
function pushThinkingMessage() {
  messageList.value.push({
    id: uuidv4(),
    identity: "assistant",
    role: "助手",
    data: [{ type: "thinking", text: "生成中..." }],
  });
}
function removeThinkingMessage() {
  const idx = messageList.value.findIndex(
    (item) => item.identity === "assistant" && Array.isArray(item.data) && item.data.some((d) => d.type === "thinking"),
  );
  if (idx !== -1) messageList.value.splice(idx, 1);
}
async function sendMsg(data: string) {
  messageList.value.push({
    id: uuidv4(),
    identity: "user",
    data: [{ type: "text", text: data }],
  });
  canSend.value = false;
  pushThinkingMessage();
  sendWs({
    type: "msg",
    data: { type: "user", data },
  });
  // setHistoryMessage();
}
// ==================== 生命周期 ====================
onMounted(() => {
  getHistoryMessage();
  getStoryLine();
});
onUnmounted(() => {
  ws?.close?.();
});

// ==================== 事件处理 ====================
function handleCleanHistory() {
  sendWs({
    type: "cleanHistory",
  });
  chatHistory.value[projectId.value] = [
    {
      id: uuidv4(),
      identity: "assistant",
      role: "助手",
      data: [{ type: "text", text: "欢迎使用Toonflow!请选择小说后开始AI对话来生成小说故事线与大纲。如您需要我开始为您工作您可以跟我说开始" }],
    },
  ];
}
</script>

<style lang="scss" scoped>
.contentWrap {
  height: 100%;
  display: flex;
  .conversation {
    position: static;
    height: calc(100%);
    width: 25vw;
  }
  .workspace {
    height: calc(100% + 44px);
    padding-left: 10px;
    width: 70%;
    overflow: auto;
  }
}
.addOriginText {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-radius: 8px;
  background-color: var(--td-brand-color-light);
  margin-bottom: 8px;
}
.originTextBtn {
  cursor: pointer;
  color: var(--td-text-color-primary);
}
</style>
