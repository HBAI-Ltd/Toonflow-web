<template>
  <div class="scriptAgent">
    <Splitpanes class="default-theme data f">
      <Pane :size="25" :min-size="15" class="operate">
        <div class="box pr">
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
              <t-popup trigger="click" placement="top-left">
                <t-button shape="square" variant="outline" size="small">
                  <template #icon>
                    <i-setting-config size="16" />
                  </template>
                </t-button>
                <template #content>
                  <div class="settingMenu">
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
            </template>
          </t-chat-sender>
          <i-dot class="dot" theme="outline" :fill="connected ? 'green' : 'red'" />
        </div>
      </Pane>
      <Pane :size="75" :min-size="30" class="data">
        <div class="tabsWrapper">
          <t-tabs v-model="currentTable">
            <template #action>
              <div class="ac"></div>
            </template>
            <!-- <t-tab-panel :value="1" label="章节事件">
              <pre>{{ planData.event }}</pre>
            </t-tab-panel> -->
            <t-tab-panel :value="1" label="故事骨架">
              <div class="panelContent">
                <MdPreview v-if="planData.storySkeleton" :modelValue="planData.storySkeleton" />
                <t-empty v-else title="暂无内容" />
              </div>
            </t-tab-panel>
            <t-tab-panel :value="2" label="改编策略">
              <div class="panelContent">
                <MdPreview v-if="planData.adaptationStrategy" :modelValue="planData.adaptationStrategy" />
                <t-empty v-else title="暂无内容" />
              </div>
            </t-tab-panel>
            <t-tab-panel :value="3" label="剧本">
              <div class="panelContent">
                <t-empty v-if="!planData.script?.length" title="暂无内容" />
                <div v-else class="scriptList">
                  <div v-for="(item, index) in planData.script" :key="index" class="scriptCard">
                    <div class="scriptCardHeader">
                      <span class="scriptIndex">#{{ index + 1 }}</span>
                      <span class="scriptTitle">{{ item.title }}</span>
                    </div>
                    <div class="scriptCardBody">
                      <pre v-if="item.content">{{ item.content }}</pre>
                      <span v-else class="emptyContent">暂无内容</span>
                    </div>
                  </div>
                </div>
              </div>
            </t-tab-panel>
          </t-tabs>
        </div>
      </Pane>
    </Splitpanes>
  </div>
</template>

<script setup lang="ts">
import _ from "lodash";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import { MdPreview } from "md-editor-v3";
import type { ChatMessagesData } from "@tdesign-vue-next/chat";
import settingStore from "@/stores/setting";
import { useSocket } from "@/utils/useSocket";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";

const { baseUrl } = storeToRefs(settingStore());
const { project } = storeToRefs(projectStore());

const inputValue = ref("");
const loadingHistory = ref(false);
const status = ref<"idle" | "pending" | "streaming">("idle");
const currentMessageId = ref<string | null>(null);

const planData = ref({
  event: "",
  storySkeleton: "",
  adaptationStrategy: "",
  script: [
    {
      title: "第一幕",
      content: "123213123123123123123",
    },
  ],
});

async function getData() {
  const { data } = await axios.post(`/novel/getNovel`, {
    projectId: project.value?.id,
    page: 1,
    limit: 99999,
  });
  const eventString = data.data.map((i: any) => [`第${i.index}章，标题：${i.chapter}，事件：${i.event}`].join("\n")).join("\n");
  planData.value.event = eventString;
}

onMounted(() => {
  getData();
});

const welcomeMsg: ChatMessagesData = {
  id: "welcome",
  role: "assistant",
  content: [
    { type: "text", status: "complete", data: "你好！我是 Toonflow 智能助手，需要我开始为您生成剧本吗？" },
    {
      type: "suggestion",
      status: "complete",
      data: [{ title: "开始生成故事骨架", prompt: "开始生成故事骨架" }],
    },
  ],
};

const messages = ref<ChatMessagesData[]>([welcomeMsg]);
// ============== Socket ==============

const { connected, socket } = useSocket(`${baseUrl.value}/socket/scriptAgent`, {
  isolationKey: `${project.value?.id}:scriptAgent`,
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

  socket.on("getPlanData", (_, callback) => {
    callback(planData.value);
  });

  socket.on("setPlanData", ({ key, value }) => {
    _.set(planData.value, key, value);
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

const memoryTypeLabel: Record<string, string> = { message: "消息记忆", summary: "摘要记忆", all: "全部记忆" };

function handleClearMemory(type: "message" | "summary" | "all") {
  const dialog = DialogPlugin.confirm({
    header: "确认清空",
    body: `确定要清空${memoryTypeLabel[type]}吗？此操作无法撤销。`,
    confirmBtn: "确认清空",
    cancelBtn: "取消",
    theme: "warning",
    onConfirm: async () => {
      await axios.post(`/agents/clearMemory`, { projectId: project.value?.id, agentType: "scriptAgent", type });
      MessagePlugin.success(`${memoryTypeLabel[type]}已清空`);
      dialog.destroy();
      getHistory();
    },
  });
}

const currentTable = ref(1);

async function getHistory() {
  loadingHistory.value = true;
  const { data } = await axios.post(`/agents/getMemory`, {
    projectId: project.value?.id,
    agentType: "scriptAgent",
  });
  messages.value = [welcomeMsg, ...data];
  sortMessages();
  loadingHistory.value = false;
}
</script>

<style lang="scss" scoped>
.scriptAgent {
  height: calc(100% - 1rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  :deep(.splitpanes__pane) {
    background-color: transparent !important;
  }
  :deep(.splitpanes__splitter) {
    border-left: none;
    margin-left: 1px;
  }
  .data {
    flex: 1;
    overflow: hidden;
    :deep(.operate) {
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 250px;
      height: 100%;
      .box {
        padding-top: 0.5rem;
        flex: 1;
        display: flex;
        flex-direction: column;
        border-radius: 10px;
        border: 1px solid #e6e3e3;
        background-color: #fff;
        overflow: hidden;
        position: relative;
        width: 100%;
        height: 100%;
        padding-left: 0.5rem;
        .inputBox {
          padding-right: 0.5rem;
          padding-bottom: 0.5rem;
        }
        .dot {
          position: absolute;
          top: 10px;
          left: 10px;
        }
      }
      .t-chat__list {
        padding-right: 0.5rem;
      }
    }
    :deep(.data) {
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
      .tabsWrapper {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: padding-bottom 0.3s ease;
        .t-tabs {
          display: flex;
          flex-direction: column;
          height: 100%;
          .t-tabs__header {
            flex-shrink: 0;
          }
          .t-tabs__content {
            flex: 1;
            overflow: hidden;
          }
          .t-tab-panel {
            height: 100%;
          }
        }
      }
    }
  }
}

.panelContent {
  height: 100%;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  box-sizing: border-box;
}

.scriptList {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.scriptCard {
  border: 1px solid var(--td-border-level-2-color);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  .scriptCardHeader {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: #f5f7fa;
    border-bottom: 1px solid var(--td-border-level-2-color);
    .scriptIndex {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--td-brand-color);
      flex-shrink: 0;
    }
    .scriptTitle {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--td-text-color-primary);
    }
  }
  .scriptCardBody {
    font-size: 0.8125rem;
    line-height: 1.7;
    color: var(--td-text-color-primary);
    padding: 0.5rem 0.75rem;

    .emptyContent {
      display: block;
      padding: 0.5rem 0.75rem;
      color: var(--td-text-color-placeholder);
    }
    :deep(.md-editor-preview-wrapper) {
      padding: 0.5rem 0.75rem;
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
:deep(.t-tabs__operations--right) {
  top: 0;
  bottom: 0;
}
</style>
