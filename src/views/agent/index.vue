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
          <t-tabs v-model="currentTable" @change="changeTab">
            <template #action>
              <div class="ac" v-if="currentTable != 3">
                <t-button @click="editMdPreview">编辑</t-button>
              </div>
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
                      <div class="scriptCardHeaderLeft">
                        <span class="scriptIndex">#{{ index + 1 }}</span>
                        <span class="scriptTitle">{{ item.name }}</span>
                      </div>
                      <div class="scriptCardActions">
                        <t-button size="small" @click="editScript(index)">
                          <template #icon><i-edit size="14" /></template>
                          编辑
                        </t-button>
                      </div>
                    </div>
                    <div class="scriptCardBody">
                      <pre v-if="item.content">{{ item.content }}</pre>
                      <span v-else class="emptyContent">暂无内容</span>
                    </div>
                    <div v-if="item.relatedAssets?.length" class="scriptCardFooter ac">
                      <span class="assetsLabel">
                        <i-link size="12" />
                        关联资产
                      </span>
                      <div class="assetsTags">
                        <t-tag v-for="(asset, ai) in item.relatedAssets" size="small" :key="ai" variant="light" theme="warning">
                          {{ asset.name }}
                        </t-tag>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </t-tab-panel>
          </t-tabs>
        </div>
      </Pane>
    </Splitpanes>
    <editMdPreivew v-model="dialogVisible" @save="onConfirm" :content="editContent" />

    <!-- 剧本编辑对话框 -->
    <t-dialog
      v-model:visible="scriptEditVisible"
      header="编辑剧本"
      width="680px"
      :confirm-btn="{ content: '保存', theme: 'primary' }"
      @confirm="saveScript"
      @close="scriptEditVisible = false">
      <div class="scriptEditForm">
        <div class="scriptEditField">
          <label>标题</label>
          <t-input v-model="scriptEditData.name" placeholder="请输入标题" />
        </div>
        <div class="scriptEditField">
          <label>内容</label>
          <t-textarea v-model="scriptEditData.content" placeholder="请输入剧本内容" :autosize="{ minRows: 8, maxRows: 16 }" />
        </div>
        <div class="scriptEditField">
          <label>关联资产</label>

          <div class="assets-section">
            <div class="assets-header">
              <t-button size="small" theme="primary" variant="outline" @click="handleSelectAssets">
                <template #icon><i-plus /></template>
                选择资产
              </t-button>
            </div>
            <div class="assets-list" v-if="scriptEditData.relatedAssets.length">
              <t-tag v-for="asset in scriptEditData.relatedAssets" :key="asset.id" closable variant="light-outline" @close="removeAsset(asset.id)">
                {{ asset.name }}
              </t-tag>
            </div>
            <div v-else class="assets-empty">暂未关联资产</div>
          </div>
        </div>
      </div>
    </t-dialog>
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
import editMdPreivew from "@/components/editMdPreivew.vue";
import openAssetsSelector from "@/utils/assetsCheck";
import type { TabValue } from "tdesign-vue-next/es/tabs/type";
const { baseUrl } = storeToRefs(settingStore());
const { project } = storeToRefs(projectStore());

const inputValue = ref("");
const loadingHistory = ref(false);
const status = ref<"idle" | "pending" | "streaming">("idle");
const currentMessageId = ref<string | null>(null);

const dialogVisible = ref(false);
const editContent = ref("");
const memoryTypeLabel: Record<string, string> = { message: "消息记忆", summary: "摘要记忆", all: "全部记忆" };
const currentTable = ref(1);
interface Asset {
  id: number;
  name: string;
  describe: string;
  prompt: string;
  type: "role" | "tool" | "scene" | "clip";
}
interface Script {
  id: number;
  name: string;
  content: string;
  relatedAssets: Asset[];
}
interface PlanData {
  storySkeleton: string;
  adaptationStrategy: string;
  script: Script[];
}

const planData = ref<PlanData>({
  storySkeleton: "",
  adaptationStrategy: "",
  script: [],
});

watch(
  () => [planData.value.storySkeleton, planData.value.adaptationStrategy],
  () => {
    // setPlanData();
  },
  { immediate: true },
);

async function getPlanData() {
  const { data } = await axios.post("/scriptAgent/getPlanData", { projectId: project.value?.id, agentType: "scriptAgent" });
  planData.value.storySkeleton = data.storySkeleton;
  planData.value.adaptationStrategy = data.adaptationStrategy;
}

onMounted(() => {
  getPlanData();
});

const welcomeMsg: ChatMessagesData = {
  id: "welcome",
  role: "assistant",
  content: [
    { type: "text", status: "complete", data: "你好！我是 Toonflow 智能助手，需要我开始为您生成剧本吗？" },
    {
      type: "suggestion",
      status: "complete",
      data: [{ title: "开始", prompt: "开始" }],
    },
  ],
};

const messages = ref<ChatMessagesData[]>([welcomeMsg]);
// ============== Socket ==============

const { connected, socket } = useSocket(`${baseUrl.value}/socket/scriptAgent`, {
  isolationKey: `${project.value?.id}:scriptAgent`,
  projectId: project.value?.id,
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
    if (key == "script") {
      getScriptApi();
    } else _.set(planData.value, key, value);
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

// ============== 剧本编辑 ==============
const scriptEditVisible = ref(false);
const scriptEditIndex = ref(-1);
const newAssetInput = ref("");
const scriptEditData = ref<Script>({ id: -1, name: "", content: "", relatedAssets: [] });

function editScript(index: number) {
  const item = planData.value.script[index];
  scriptEditIndex.value = index;
  scriptEditData.value = {
    id: item.id,
    name: item.name,
    content: item.content,
    relatedAssets: [...(item.relatedAssets ?? [])],
  };
  newAssetInput.value = "";
  scriptEditVisible.value = true;
}

async function saveScript() {
  if (scriptEditIndex.value < 0) return;
  planData.value.script[scriptEditIndex.value] = {
    ...planData.value.script[scriptEditIndex.value],
    ...scriptEditData.value,
  };

  try {
    await axios.post("/script/updateScript", {
      id: scriptEditData.value.id,
      name: scriptEditData.value.name,
      content: scriptEditData.value.content,
      assets: scriptEditData.value.relatedAssets.map((a) => a.id),
    });
    MessagePlugin.success("剧本更新成功");
    scriptEditVisible.value = false;
  } catch (error) {
    console.error("更新剧本失败:", error);
    MessagePlugin.error("更新剧本失败，请稍后再试");
  } finally {
  }
}

function removeAsset(id: number) {
  scriptEditData.value.relatedAssets = scriptEditData.value.relatedAssets.filter((a) => a.id !== id);
}

//编辑markdown
function editMdPreview() {
  if (currentTable.value == 1) editContent.value = planData.value.storySkeleton;
  else if (currentTable.value == 2) editContent.value = planData.value.adaptationStrategy;
  dialogVisible.value = true;
}
function onConfirm(value: string) {
  editContent.value = value;
  switch (currentTable.value) {
    case 1:
      planData.value.storySkeleton = value;
      return;
    case 2:
      planData.value.adaptationStrategy = value;
      return;
  }
  dialogVisible.value = false;
}

async function handleSelectAssets() {
  const assets = await openAssetsSelector({ title: "选择关联资产", types: ["role", "tool", "scene"] });
  if (assets.length) {
    const existing = new Set(scriptEditData.value.relatedAssets.map((a) => a.id));
    for (const a of assets) {
      if (!existing.has(a.id)) {
        scriptEditData.value.relatedAssets.push({ id: a.id, name: a.name, describe: a.describe, prompt: a.prompt, type: a.type });
      }
    }
  }
}

async function getScriptApi() {
  try {
    const res = await axios.post("/script/getScrptApi", {
      projectId: project.value?.id,
    });
    console.log("%c Line:424 🍻 res.data", "background:#33a5ff", res.data);

    planData.value.script = res.data;
  } catch (error) {
    console.error("搜索剧本失败:", error);
    MessagePlugin.error("搜索剧本失败");
  }
}
function changeTab(value: TabValue) {
  if (value == 3) {
    getScriptApi();
  }
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
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.scriptCard {
  border: 1px solid var(--td-border-level-2-color);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s ease;
  .scriptCardHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: #f5f7fa;
    border-bottom: 1px solid var(--td-border-level-2-color);
    .scriptCardHeaderLeft {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }
    .scriptCardActions {
      flex-shrink: 0;
    }
    .scriptIndex {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--td-brand-color);
      flex-shrink: 0;
      background: var(--td-brand-color-light);
      padding: 1px 6px;
      border-radius: 4px;
    }
    .scriptTitle {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--td-text-color-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  .scriptCardBody {
    font-size: 0.8125rem;
    line-height: 1.7;
    color: var(--td-text-color-primary);
    padding: 0.625rem 0.75rem;
    flex: 1;
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: inherit;
    }
    .emptyContent {
      display: block;
      color: var(--td-text-color-placeholder);
      font-size: 0.8125rem;
    }
    :deep(.md-editor-preview-wrapper) {
      padding: 0;
    }
  }
  .scriptCardFooter {
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-top: 1px solid var(--td-border-level-2-color);
    background-color: #fafafa;
    .assetsLabel {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 0.75rem;
      color: var(--td-text-color-secondary);
      white-space: nowrap;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .assetsTags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
  }
}

.scriptEditForm {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.25rem 0;
  .scriptEditField {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--td-text-color-secondary);
    }
  }
  .assetsEditor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border: 1px solid var(--td-border-level-2-color);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    background: #fafafa;
    .assetsTagList {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      min-height: 1.5rem;
    }
    .assetsInputRow {
      display: flex;
      gap: 0.5rem;
      align-items: center;
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
:deep(.t-tabs__btn--right) {
  display: none;
}
</style>
