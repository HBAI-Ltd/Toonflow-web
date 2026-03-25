<template>
  <div class="rightChatBox" :style="{ width: boxWidth + 'px' }">
    <div ref="resizeHandleRef" class="resize-handle"></div>
    <div class="header f ac jb">
      <span class="text">
        <i-dot theme="outline" :fill="connected ? 'green' : 'red'" />
        {{ props.title }}
      </span>
      <div class="close">
        <i-click-to-fold size="18" @click.stop="emit('close')" />
      </div>
    </div>
    <div class="chatBox" v-loading="loadingHistory">
      <t-chat-list :clear-history="false">
        <t-chat-message
          v-for="message in messages"
          :key="message.id"
          :message="message"
          :placement="message.role === 'user' ? 'right' : 'left'"
          :variant="message.role === 'user' ? 'base' : 'outline'"
          :handleActions="message.role === 'user' ? {} : handleActions"
          :status="message.status"
          allowContentSegmentCustom>
          <!-- <template #actionbar>
            <t-chat-actionbar :action-bar="['replay', 'copy']" />
          </template> -->
        </t-chat-message>
      </t-chat-list>
      <t-chat-sender
        class="inputBox"
        v-model="inputValue"
        :loading="status === 'pending' || status === 'streaming'"
        placeholder="请输入内容"
        @send="handleSend"
        @stop="handleStop">
        <template #footer-prefix>
          <div class="ac" style="gap: 5px">
            <t-popup trigger="click" placement="top-left">
              <t-button shape="square" variant="outline" size="small">
                <template #icon>
                  <i-setting-config size="16" />
                </template>
              </t-button>
              <template #content>
                <div class="settingMenu">
                  <div class="settingMenuItem" @click="handleSend('调整偏好模型')">
                    <i-setting-config size="14" />
                    <span>调整偏好模型</span>
                  </div>
                  <div class="settingMenuItem" @click="handleClearMemory('message')">
                    <i-delete size="14" />
                    <span>清空消息记忆</span>
                  </div>
                  <div class="settingMenuItem" @click="handleClearMemory('summary')">
                    <i-close size="14" />
                    <span>清空摘要记忆</span>
                  </div>
                  <div class="settingMenuItem danger" @click="handleClearMemory('all')">
                    <i-delete-one size="14" />
                    <span>清空全部记忆</span>
                  </div>
                </div>
              </template>
            </t-popup>
            <div class="ac modelSelCls">
              <modelSelect class="paramSelect" v-model="imageModelData.modelId" type="image" size="small" />
              <t-select v-model="imageModelData.ratio" class="paramSelect ml-5" size="small" placeholder="比例">
                <t-option value="16:9" label="16:9" />
                <t-option value="9:16" label="9:16" />
                <t-option value="1:1" label="1:1" />
              </t-select>
              <t-select v-model="imageModelData.quality" class="paramSelect ml-5" size="small" placeholder="质量">
                <t-option value="1K" label="1K" />
                <t-option value="2K" label="2K" />
                <t-option value="4K" label="4K" />
              </t-select>
            </div>
          </div>
        </template>
      </t-chat-sender>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from "lodash";
import axios from "@/utils/axios";
import type { ChatMessagesData } from "@tdesign-vue-next/chat";
import { DialogPlugin } from "tdesign-vue-next";
import { useMousePressed, useMouse } from "@vueuse/core";
import projectStore from "@/stores/project";
import settingStore from "@/stores/setting";
import { useSocket } from "@/utils/useSocket";
import type { FlowData } from "../../utils/flowBuilder";
import ModelSelect from "@/components/modelSelect.vue";

const { baseUrl } = storeToRefs(settingStore());
const { project } = storeToRefs(projectStore());
const props = defineProps({
  title: { type: String, default: "" },
  episodesId: { type: Number, required: true },
});
const emit = defineEmits(["close"]);
// const inputValue = ref("请输出500字小作文，去洗车店洗车走路更快还是开车更快");
const inputValue = ref("生成衍生资产");
const loadingHistory = ref(false);
const status = ref<"idle" | "pending" | "streaming">("idle");
const currentMessageId = ref<string | null>(null);

const welcomeMsg: ChatMessagesData = {
  id: "welcome",
  role: "assistant",
  content: [
    { type: "text", status: "complete", data: "你好！我是 Toonflow 智能助手，需要我开始为您制作视频吗？" },
    {
      type: "suggestion",
      status: "complete",
      data: [
        { title: "调整偏好模型", prompt: "调整偏好模型" },
        { title: "开始制作视频", prompt: "请开始制作视频" },
      ],
    },
  ],
};

const messages = ref<ChatMessagesData[]>([welcomeMsg]);
const imageModelData = ref({
  modelId: "",
  ratio: "",
  quality: "",
});
// ============== Socket ==============

const { connected, socket } = useSocket(`${baseUrl.value}/socket/productionAgent`, {
  isolationKey: `${project.value?.id}:productionAgent:${props.episodesId}`,
  projectId: project.value?.id,
  scriptId: props.episodesId,
});

const flowData = defineModel<FlowData>({
  required: true,
});

onMounted(() => {
  socket.connect();
  socket.on("textMessage", (data) => {
    if (data.type === "start") {
      currentMessageId.value = data.messageId;
      status.value = "pending";
      messages.value.push({ id: data.messageId, role: data.role, status: "pending", content: [{ type: "text", data: "" }] });
    } else {
      const msg = messages.value.find((m) => m.id === data.messageId);
      if (!msg) return;
      if (data.type === "content") {
        status.value = "streaming";
        msg.status = "streaming";
        msg.content![0].data += data.delta!;
      } else if (data.type === "end") {
        status.value = "idle";
        currentMessageId.value = null;
        msg.status = "complete";
        msg.content![0].status = "complete";
      }
    }
    sortMessages();
  });

  socket.on("systemMessage", (data) => {
    messages.value.push({ id: data.messageId, role: "system", status: "complete", content: [{ type: "text", data: data.content }] });
    sortMessages();
  });

  socket.on("getFlowData", (_, callback) => {
    callback(flowData.value);
  });

  socket.on("setFlowData", ({ key, value }) => {
    console.log("%c Line:156 🍇 value", "background:#ffdd4d", value);
    console.log("%c Line:156 🍐 key", "background:#6ec1c2", key);
    if (key == "setAssetsImage") {
      const { id, src, state } = value as any;
      // 先在父资产中查找
      const parentIndex = flowData.value.assets.findIndex((i) => i.id == id);

      console.log("%c Line:163 🍫 flowData.value.assets", "background:#42b983", flowData.value.assets);
      console.log("资产查找索引", parentIndex);
      if (parentIndex !== -1) {
        flowData.value.assets[parentIndex] = { ...flowData.value.assets[parentIndex], src, state };
      } else {
        // 再在子资产（derive）中查找
        for (let ai = 0; ai < flowData.value.assets.length; ai++) {
          const asset = flowData.value.assets[ai];
          const deriveIndex = asset.derive?.findIndex((d) => d.id == id);
          if (deriveIndex !== undefined && deriveIndex !== -1) {
            const newDerive = [...asset.derive];
            newDerive[deriveIndex] = { ...newDerive[deriveIndex], src, state };
            flowData.value.assets[ai] = { ...asset, derive: newDerive };
            break;
          }
        }
      }
      console.log("%c Line:169 🍎 flowData.value", "background:#7f2b82", flowData.value);

      return;
    }
    if (key == "addAssets") {
      const deriveMap: any = {};
      value.forEach((i: any) => {
        if (!deriveMap[i.assetsId]) deriveMap[i.assetsId] = [i];
        else deriveMap[i.assetsId].push(i);
      });
      console.log("%c Line:208 🍉 deriveMap", "background:#7f2b82", deriveMap);

      flowData.value.assets.forEach((i) => {
        if (deriveMap[i.id]) {
          i.derive = [...i.derive, ...deriveMap[i.id]];
          console.log("%c Line:217 🍅 i.derive", "background:#f5ce50", i.derive);
        }
      });
      console.log("%c Line:215 🍖 flowData.value", "background:#93c0a4", flowData.value);

      return;
    }
    if (key == "setStoryboardImage") {
      const { id, src, state } = value as any;
      // 先在父资产中查找
      const parentIndex = flowData.value.storyboard.findIndex((i) => i.id == id);
      console.log("%c Line:183 🍋 parentIndex", "background:#e41a6a", parentIndex);
      if (parentIndex !== -1) {
        console.log("%c Line:185 🌮", "background:#ffdd4d");
        flowData.value.storyboard[parentIndex] = { ...flowData.value.storyboard[parentIndex], src, state };
      }
      return;
    }
    _.set(flowData.value, key, value);
  });

  getHistory();
});
onUnmounted(() => {
  socket.disconnect();
});

function sortMessages() {
  messages.value = messages.value.sort((a, b) => {
    const aPending = a.status === "pending" ? 1 : 0;
    const bPending = b.status === "pending" ? 1 : 0;
    return aPending - bPending;
  });
}

// ============== Actions ==============

function handleSend(text: string) {
  messages.value.push({ id: `user-${Date.now()}`, role: "user", content: [{ type: "text", data: text }] });
  socket.send("message", text);
  inputValue.value = "";
}

function handleStop() {
  if (!currentMessageId.value) return;
  socket.send("stop", currentMessageId.value);
  const msg = messages.value.find((m) => m.id === currentMessageId.value);
  if (msg) {
    msg.status = "complete";
    msg.content![0].status = "complete";
  }
  status.value = "idle";
  currentMessageId.value = null;
}

const handleActions = {
  suggestion: (data?: any) => handleSend(data?.content?.prompt),
};

// ============== Memory ==============

const memoryTypeLabel: Record<string, string> = { message: "消息记忆", summary: "摘要记忆", all: "全部记忆" };

function handleClearMemory(type: "message" | "summary" | "all") {
  const dialog = DialogPlugin.confirm({
    header: "确认清空",
    body: `确定要清空${memoryTypeLabel[type]}吗？此操作无法撤销。`,
    confirmBtn: "确认清空",
    cancelBtn: "取消",
    theme: "warning",
    onConfirm: async () => {
      await axios.post(`/agents/clearMemory`, { projectId: project.value?.id, agentType: "productionAgent", episodesId: props.episodesId, type });
      window.$message.success(`${memoryTypeLabel[type]}已清空`);
      dialog.destroy();
      getHistory();
    },
  });
}

async function getHistory() {
  loadingHistory.value = true;
  const { data } = await axios.post(`/agents/getMemory`, {
    projectId: project.value?.id,
    episodesId: props.episodesId,
    agentType: "productionAgent",
  });
  messages.value = [welcomeMsg, ...data];
  sortMessages();
  loadingHistory.value = false;
}

// ============== Resize ==============

const resizeHandleRef = ref<HTMLElement | null>(null);
const boxWidth = ref(400);
const MIN_WIDTH = 400;
const { pressed } = useMousePressed({ target: resizeHandleRef });
const { x } = useMouse();
const dragStartX = ref(0);
const dragStartWidth = ref(400);

watch(pressed, (isPressed) => {
  if (isPressed) {
    dragStartX.value = x.value;
    dragStartWidth.value = boxWidth.value;
  }
});

watchEffect(() => {
  if (pressed.value) {
    boxWidth.value = Math.max(MIN_WIDTH, dragStartWidth.value + (dragStartX.value - x.value));
  }
});
watch(
  () => imageModelData.value,
  (newVal) => {
    socket.send("setModelData", { ...imageModelData.value });
  },
  {
    deep: true,
  },
);
watch(
  () => props.episodesId,
  (newVal) => {
    socket.send("setKeyScript", { key: `${project.value?.id}:productionAgent:${props.episodesId}`, scriptId: props.episodesId });
    getHistory();
  },
);
</script>

<style lang="scss" scoped>
.rightChatBox {
  position: absolute;
  top: 10px;
  right: 0;
  bottom: 10px;
  display: flex;
  flex-direction: column;
  z-index: 9999;
  min-width: 400px;
  height: calc(100% - 20px);
  margin-right: 5px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  background-color: #fff;
  overflow-y: auto;

  .resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    cursor: col-resize;
    z-index: 10;
    &:hover {
      background-color: rgba(0, 0, 0, 0.08);
    }
  }
  box-shadow: -4px 2px 10px rgba(53, 53, 53, 0.1);
  .chatBox {
    width: 100%;
    height: calc(100% - 50px);
    display: flex;
    flex-direction: column;
    padding-left: 0.5rem;
    .inputBox {
      padding-right: 0.5rem;
    }
  }
  :deep(.t-chat__list) {
    padding-right: 0.5rem;
  }
  .header {
    height: 40px;
    line-height: 40px;
    padding: 0 10px;
    flex-shrink: 0;
    .text {
      font-size: 18px;
    }
    .close {
      cursor: pointer;
      aspect-ratio: 1/1;
    }
  }
}

.settingMenu {
  padding: 4px 0;
  .settingMenuItem {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 16px;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    &:hover {
      background-color: #f3f3f3;
    }
    &.danger {
      color: #e34d59;
    }
  }
}
.modelSelCls {
  gap: 5px;
  .paramSelect {
    max-width: 80px;
  }
}
</style>
