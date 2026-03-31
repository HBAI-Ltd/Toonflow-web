<template>
  <div class="scriptAgent">
    <Splitpanes class="default-theme data f">
      <Pane :size="30" :min-size="15" class="operate">
        <div class="box pr">
          <t-chat-list :clear-history="false">
            <t-chat-message
              v-for="message in messages"
              :key="message.id"
              :message="message"
              :name="(message as any).name"
              :placement="message.role === 'user' ? 'right' : 'left'"
              :variant="message.role === 'user' ? 'base' : 'outline'"
              :handleActions="message.role === 'user' ? {} : handleActions"
              :status="message.status"
              allowContentSegmentCustom>
              <!-- <template #actionbar> -->
              <!-- <t-chat-actionbar :action-bar="['replay', 'copy']" /> -->
              <!-- <t-chat-actionbar :action-bar="['replay', 'copy']" /> -->
              <!-- </template> -->
            </t-chat-message>
          </t-chat-list>
          <t-chat-sender
            class="inputBox"
            :disabled="status === 'pending' || status === 'streaming'"
            v-model="inputValue"
            :loading="status === 'pending' || status === 'streaming'"
            placeholder="$t('workbench.scriptAgent.inputPlaceholder')"
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
                      <span>{{ $t("workbench.scriptAgent.clearMessageMemory") }}</span>
                    </div>
                    <div class="settingMenuItem" @click="handleClearMemory('summary')">
                      <i-close size="14" />
                      <span>{{ $t("workbench.scriptAgent.clearSummaryMemory") }}</span>
                    </div>
                    <div class="settingMenuItem danger" @click="handleClearMemory('all')">
                      <i-delete-one size="14" />
                      <span>{{ $t("workbench.scriptAgent.clearAllMemory") }}</span>
                    </div>
                  </div>
                </template>
              </t-popup>
            </template>
          </t-chat-sender>
          <i-dot class="dot" theme="outline" :fill="connected ? 'green' : 'red'" />
          <transition name="fade">
            <div v-if="forceGenerateVisible" class="forceGenerateMask">
              <div class="forceGenerateCard">
                <div class="forceGenerateDesc">{{ $t("workbench.scriptAgent.forceGenerate.desc") }}</div>
                <div class="forceGenerateActions">
                  <t-button @click="forceGenerateVisible = false">{{ $t("workbench.scriptAgent.forceGenerate.confirm") }}</t-button>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </Pane>
      <Pane :size="70" :min-size="30" class="data">
        <div class="tabsWrapper">
          <t-tabs v-model="currentTable">
            <template #action>
              <div class="ac" v-if="currentTable == 1">
                <t-button @click="editMdPreview">{{ $t("workbench.scriptAgent.edit") }}</t-button>
              </div>
              <div class="ac" v-else-if="currentTable == 2">
                <t-button @click="editMdPreview">{{ $t("workbench.scriptAgent.edit") }}</t-button>
              </div>
            </template>
            <!-- <t-tab-panel :value="1" :label="$t('workbench.scriptAgent.chapterEvents')">
              <pre>{{ planData.event }}</pre>
            </t-tab-panel> -->
            <t-tab-panel :value="1" :label="$t('workbench.scriptAgent.storySkeleton')">
              <div class="panelContent">
                <MdPreview v-if="planData.storySkeleton" :modelValue="planData.storySkeleton" />
                <t-empty v-else :title="$t('workbench.scriptAgent.noContent')" />
              </div>
            </t-tab-panel>
            <t-tab-panel :value="2" :label="$t('workbench.scriptAgent.adaptationStrategy')">
              <div class="panelContent">
                <MdPreview v-if="planData.adaptationStrategy" :modelValue="planData.adaptationStrategy" />
                <t-empty v-else :title="$t('workbench.scriptAgent.noContent')" />
              </div>
            </t-tab-panel>
            <t-tab-panel :value="3" :label="$t('workbench.scriptAgent.script')">
              <div class="panelContent">
                <t-empty v-if="!planData.script?.length" :title="$t('workbench.scriptAgent.noContent')" />
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
                        </t-button>
                        <t-button theme="danger" variant="outline" size="small" @click="delScript(index)">
                          <template #icon><i-delete size="14" /></template>
                        </t-button>
                      </div>
                    </div>
                    <div class="scriptCardBody">
                      <pre v-if="item.content">{{ item.content }}</pre>
                      <span v-else class="emptyContent">{{ $t("workbench.scriptAgent.noContent") }}</span>
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
      :header="$t('workbench.scriptAgent.editScript')"
      width="80%"
      top="10vh"
      placement="center"
      :confirm-btn="{ content: $t('workbench.scriptAgent.save'), theme: 'primary' }"
      @confirm="saveScript"
      @close="scriptEditVisible = false">
      <div class="scriptEditForm">
        <div class="scriptEditField">
          <label>{{ $t("workbench.scriptAgent.scriptTitle") }}</label>
          <t-input v-model="scriptEditData.name" :placeholder="$t('workbench.scriptAgent.titlePlaceholder')" />
        </div>
        <div class="scriptEditField">
          <label>{{ $t("workbench.scriptAgent.content") }}</label>
          <MdEditor
            v-model="scriptEditData.content"
            :theme="'light'"
            :toolbars="toolbars"
            :footers="[]"
            style="height: 50vh"
            @onUploadImg="() => {}"
            @drop.prevent />
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { MdEditor } from "md-editor-v3";
import type { ToolbarNames } from "md-editor-v3";
import { MdPreview } from "md-editor-v3";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import axios from "@/utils/axios";
import type { ChatMessagesData } from "@tdesign-vue-next/chat";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
import editMdPreivew from "@/components/editMdPreivew.vue";
import scriptAgentStore from "@/stores/scriptAgent";
const { connected, messages, status, planData } = storeToRefs(scriptAgentStore());
const currentTable = ref(1);
const inputValue = ref("");
const toolbars: ToolbarNames[] = [
  "bold",
  "underline",
  "italic",
  "strikeThrough",
  "-",
  "title",
  "sub",
  "sup",
  "quote",
  "unorderedList",
  "orderedList",
  "task",
  "-",
  "codeRow",
  "code",
  "table",
  "-",
  "revoke",
  "next",
  "=",
  "preview",
];
const defMsg: ChatMessagesData[] = [
  {
    id: "welcome",
    role: "assistant",
    content: [
      { type: "text", status: "complete", data: $t("workbench.scriptAgent.welcomeMsg") },
      {
        type: "suggestion",
        status: "complete",
        data: [{ title: $t("workbench.scriptAgent.start"), prompt: $t("workbench.scriptAgent.start") }],
      },
    ],
  },
];

onMounted(() => {
  if (messages.value.length <= 0) messages.value = [...defMsg, ...messages.value];
  getPlanData();
  getNovel();
});
const agentWorkDataId = ref<number>();
async function getPlanData() {
  const { data } = await axios.post("/scriptAgent/getPlanData", { projectId: project.value?.id, agentType: "scriptAgent" });
  planData.value.storySkeleton = data.data.storySkeleton;
  planData.value.adaptationStrategy = data.data.adaptationStrategy;
  planData.value.script = data.data.script || [];
  agentWorkDataId.value = data.id;
}

//快捷发送
const handleActions = {
  suggestion: (data?: any) => {
    scriptAgentStore().chat(data?.content?.prompt);
  },
};

function handleSend(text: string) {
  scriptAgentStore().chat(text);
  inputValue.value = "";
}
function handleStop() {
  scriptAgentStore().stopGenerate();
}

const memoryTypeLabel: Record<string, string> = {
  message: $t("workbench.scriptAgent.memoryType.message"),
  summary: $t("workbench.scriptAgent.memoryType.summary"),
  all: $t("workbench.scriptAgent.memoryType.all"),
};
function handleClearMemory(type: "message" | "summary" | "all") {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.scriptAgent.msg.clearConfirm"),
    body: $t("workbench.scriptAgent.msg.clearBody", { type: memoryTypeLabel[type] }),
    confirmBtn: $t("workbench.scriptAgent.msg.confirmClear"),
    cancelBtn: $t("workbench.scriptAgent.msg.cancel"),
    theme: "warning",
    onConfirm: async () => {
      await axios.post(`/agents/clearMemory`, { projectId: project.value?.id, agentType: "scriptAgent", type });
      window.$message.success($t("workbench.scriptAgent.msg.memoryCleared", { type: memoryTypeLabel[type] }));
      dialog.destroy();
      getHistory();
    },
  });
}

const loadingHistory = ref(false);
async function getHistory() {
  loadingHistory.value = true;
  const { data } = await axios.post(`/agents/getMemory`, {
    projectId: project.value?.id,
    agentType: "scriptAgent",
  });
  messages.value = [...defMsg, ...data];
  loadingHistory.value = false;
}

// 强制生成蒙层
const forceGenerateVisible = ref(false);
const novelData = ref([]);

function getNovel() {
  axios.post("/novel/getNovelData", { projectId: project.value?.id }).then(({ data }: any) => {
    novelData.value = data;
    const hasUnfinished = (novelData.value as any[]).some((item: any) => item.eventState === 0);
    if (hasUnfinished && !forceGenerateVisible.value) {
      forceGenerateVisible.value = true;
    }
  });
}

const dialogVisible = ref(false);
const editContent = ref("");
//编辑markdown
function editMdPreview() {
  if (currentTable.value == 1) editContent.value = planData.value.storySkeleton;
  else if (currentTable.value == 2) editContent.value = planData.value.adaptationStrategy;
  dialogVisible.value = true;
}

const scriptEditIndex = ref(-1);
const scriptEditData = ref({
  name: "",
  content: "",
});
const scriptEditVisible = ref(false);

function editScript(index: number) {
  const item = planData.value.script[index];
  scriptEditIndex.value = index;
  scriptEditData.value = {
    name: item.name,
    content: item.content,
  };
  scriptEditVisible.value = true;
}

async function saveScript() {
  if (scriptEditIndex.value < 0) return;
  planData.value.script[scriptEditIndex.value] = { ...scriptEditData.value };
  await scriptAgentStore().setPlanData();
  await getPlanData();
  window.$message.success($t("workbench.scriptAgent.msg.scriptUpdated"));
  scriptEditVisible.value = false;
}
async function delScript(index: number) {
  const item = planData.value.script[index];
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.scriptAgent.msg.deleteConfirm"),
    body: $t("workbench.scriptAgent.msg.deleteBody"),
    confirmBtn: $t("workbench.scriptAgent.msg.confirmDelete"),
    cancelBtn: $t("workbench.scriptAgent.msg.cancel"),
    theme: "danger",
    onConfirm: async () => {
      if (item.id) {
        await axios.post("/script/delScript", { id: [item.id] });
        planData.value.script.splice(index, 1);
      } else {
        planData.value.script.splice(index, 1);
      }
      await scriptAgentStore().setPlanData();
      await getPlanData();
      window.$message.success($t("workbench.scriptAgent.msg.scriptDeleted"));
      dialog.destroy();
    },
  });
}
function onConfirm(value: string) {
  axios
    .post("/scriptAgent/updateData", {
      id: agentWorkDataId.value,
      data: {
        storySkeleton: currentTable.value == 1 ? value : planData.value.storySkeleton,
        adaptationStrategy: currentTable.value == 2 ? value : planData.value.adaptationStrategy,
      },
    })
    .then(() => {
      window.$message.success($t("workbench.scriptAgent.msg.updated"));
      getPlanData();
    })
    .catch((err) => {
      window.$message.success($t("workbench.scriptAgent.msg.error"));
    });
}
</script>

<style lang="scss" scoped>
.scriptAgent {
  height: calc(100% - 16px);
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
        padding-top: 8px;
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
        padding-left: 8px;
        .inputBox {
          padding-right: 8px;
          padding-bottom: 8px;
        }
        .dot {
          position: absolute;
          top: 10px;
          left: 10px;
        }
      }
      .t-chat__list {
        padding-right: 8px;
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
  padding: 12px 16px;
  box-sizing: border-box;
}

.scriptList {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
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
    gap: 8px;
    padding: 8px 12px;
    background-color: #f5f7fa;
    border-bottom: 1px solid var(--td-border-level-2-color);
    .scriptCardHeaderLeft {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .scriptCardActions {
      flex-shrink: 0;
      display: flex;
      gap: 4px;
    }
    .scriptIndex {
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
      background: #e6e3e3;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .scriptTitle {
      font-size: 14px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  .scriptCardBody {
    font-size: 13px;
    line-height: 1.7;
    padding: 10px 12px;
    flex: 1;
    max-height: 300px;
    overflow-y: auto;
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: inherit;
    }
    .emptyContent {
      display: block;
      font-size: 13px;
    }
    :deep(.md-editor-preview-wrapper) {
      padding: 0;
    }
  }
  .scriptCardFooter {
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid #e6e3e3;
    background-color: #fafafa;
    .assetsLabel {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 12px;
      white-space: nowrap;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .assetsTags {
      display: flex;
      flex-wrap: wrap;
      gap: 5.6px;
    }
  }
}

.scriptEditForm {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0;
  .scriptEditField {
    display: flex;
    flex-direction: column;
    gap: 6px;
    label {
      font-size: 13px;
      font-weight: 500;
    }
    .assets-list {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 10px;
    }
  }
  .assetsEditor {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-radius: 6px;
    padding: 8px 12px;
    background: #fafafa;
    .assetsTagList {
      display: flex;
      flex-wrap: wrap;
      gap: 5.6px;
      min-height: 24px;
    }
    .assetsInputRow {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }
}

.forceGenerateMask {
  position: absolute;
  inset: 0;
  background: rgba(170, 170, 170, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: 10px;
  .forceGenerateCard {
    background: #fdfbfb;
    border-radius: 12px;
    padding: 28px 32px 24px;
    max-width: 300px;
    width: 90%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    .forceGenerateDesc {
      font-size: 12px;
    }
    .forceGenerateActions {
      display: flex;
      gap: 12px;
      margin-top: 8px;
      width: 100%;
      justify-content: center;
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
