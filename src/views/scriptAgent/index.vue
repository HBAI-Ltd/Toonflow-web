<template>
  <div class="scriptAgent">
    <div class="batchHeader f ac jb">
      <div class="batchSelector f ac">
        <span class="batchLabel">{{ $t("workbench.scriptAgent.sourceBatch") }}</span>
        <t-select
          v-model="selectedImportId"
          class="batchSelect"
          :loading="importListLoading"
          :disabled="isGenerating"
          @change="handleBatchChange">
          <t-option v-if="showMainline" :value="MAINLINE_IMPORT" :label="$t('workbench.scriptAgent.projectMainline')" />
          <t-option v-for="batch in importBatches" :key="batch.id" :value="String(batch.id)" :label="batch.name || $t('workbench.scriptAgent.unnamedBatch')" />
        </t-select>
      </div>
      <span class="currentBatchName">{{ currentBatchName }}</span>
    </div>
    <Splitpanes class="default-theme data f">
      <Pane :size="30" :min-size="15" class="operate">
        <div class="box pr" :class="{ isGenerating }">
          <div class="resetBar">
            <t-button size="small" theme="danger" variant="outline" @click="handleResetConversation()" :disabled="isGenerating">
              <template #icon><i-refresh size="14" /></template>
              {{ $t("workbench.scriptAgent.resetConversation") }}
            </t-button>
          </div>
          <t-chat-list :clear-history="false">
            <t-chat-message
              v-for="message in messages"
              :key="message.id"
              :message="message"
              :name="(message as any).name"
              :placement="message.role === 'user' ? 'right' : 'left'"
              :variant="message.role === 'user' ? 'base' : 'outline'"
              :handleActions="message.role === 'user' || isGenerating ? {} : handleActions"
              :status="message.status"
              allowContentSegmentCustom>
              <template #actionbar>
                <span v-if="message.status === 'stop' || message.ext?.interrupted" class="interruptedNotice">已中断，已生成内容已保存</span>
                <div v-if="canRetry(message) || canRollback(message)" class="msgActions" :class="message.role === 'user' ? 'isUser' : 'isAssistant'">
                  <t-button v-if="canRetry(message)" size="small" variant="text" theme="default" @click="handleRetry(message)">
                    <template #icon><i-refresh size="13" /></template>
                    {{ message.role === "user" ? $t("workbench.scriptAgent.retry") : $t("workbench.scriptAgent.regenerate") }}
                  </t-button>
                  <t-button v-if="canRollback(message)" size="small" variant="text" theme="default" @click="handleRollback(message)">
                    <template #icon><i-rollback size="13" /></template>
                    {{ $t("workbench.scriptAgent.rollback") }}
                  </t-button>
                </div>
              </template>
            </t-chat-message>
          </t-chat-list>
          <t-chat-sender
            class="inputBox"
            :disabled="isGenerating"
            v-model="inputValue"
            :loading="isGenerating"
            placeholder="$t('workbench.scriptAgent.inputPlaceholder')"
            @send="handleSend"
            @stop="handleStop">
            <template #footer-prefix>
              <t-popup trigger="click" placement="top-left">
                <t-button shape="square" variant="outline" size="small" :disabled="isGenerating">
                  <template #icon>
                    <i-setting-config size="16" />
                  </template>
                </t-button>
                <template #content>
                  <div class="settingMenu">
                    <div class="settingMenuItem" @click="handleReconnect()">
                      <i-api size="14" />
                      <span>{{ $t("workbench.scriptAgent.reconnect") }}</span>
                    </div>
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
              <t-popup trigger="click" placement="top" v-if="showThink">
                <t-button
                  size="small"
                  variant="outline"
                  :theme="(['default', 'success', 'warning', 'danger'] as const)[thinkLevel] || 'default'"
                  style="margin-left: 8px">
                  <template #icon>
                    <i-tips size="16" />
                  </template>
                  {{ thinkLevelOptions[thinkLevel]?.label }}
                </t-button>
                <template #content>
                  <div class="settingMenu">
                    <div
                      v-for="opt in thinkLevelOptions"
                      :key="opt.value"
                      class="settingMenuItem"
                      :class="{ active: thinkLevel === opt.value }"
                      @click="scriptAgentStore().updateThinkConfig(opt.value)">
                      <span>{{ opt.label }}</span>
                    </div>
                  </div>
                </template>
              </t-popup>
              <t-tooltip
                v-if="project?.contentFormat === 'explainer_video'"
                :content="autoAdvance ? $t('workbench.scriptAgent.autoAdvance.onTip') : $t('workbench.scriptAgent.autoAdvance.offTip')"
                placement="top">
                <t-button
                  size="small"
                  variant="outline"
                  :theme="autoAdvance ? 'warning' : 'default'"
                  style="margin-left: 8px"
                  :disabled="!connected"
                  @click="toggleAutoAdvance()">
                  <template #icon>
                    <i-pause v-if="autoAdvance" size="16" />
                    <i-play v-else size="16" />
                  </template>
                  {{ autoAdvance ? $t("workbench.scriptAgent.autoAdvance.on") : $t("workbench.scriptAgent.autoAdvance.off") }}
                </t-button>
              </t-tooltip>
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
                <t-button :disabled="isGenerating" @click="editMdPreview">{{ $t("workbench.scriptAgent.edit") }}</t-button>
              </div>
              <div class="ac" v-else-if="currentTable == 2">
                <t-button :disabled="isGenerating" @click="editMdPreview">{{ $t("workbench.scriptAgent.edit") }}</t-button>
              </div>
            </template>
            <!-- <t-tab-panel :value="1" :label="$t('workbench.scriptAgent.chapterEvents')">
              <pre>{{ planData.event }}</pre>
            </t-tab-panel> -->
            <t-tab-panel v-if="project?.contentFormat === 'explainer_video'" :value="0" :label="$t('workbench.scriptAgent.preflightResult')">
              <div class="panelContent">
                <PreflightPanel
                  :state="planData.preflight"
                  :report="planData.preflightReport"
                  :busy="isGenerating"
                  :connected="connected"
                  :session-key="sessionAgentStore.$id"
                  :theme="themeSetting.mode === 'auto' ? undefined : themeSetting.mode"
                  @action="handlePreflightAction" />
              </div>
            </t-tab-panel>
            <t-tab-panel :value="1" :label="$t('workbench.scriptAgent.storySkeleton')">
              <div class="panelContent">
                <MdPreview
                  v-if="planData.storySkeleton"
                  :modelValue="planData.storySkeleton"
                  :theme="themeSetting.mode === 'auto' ? undefined : themeSetting.mode" />
                <t-empty v-else :title="$t('workbench.scriptAgent.noContent')" />
              </div>
            </t-tab-panel>
            <t-tab-panel :value="2" :label="$t('workbench.scriptAgent.adaptationStrategy')">
              <div class="panelContent">
                <MdPreview
                  v-if="planData.adaptationStrategy"
                  :modelValue="planData.adaptationStrategy"
                  :theme="themeSetting.mode === 'auto' ? undefined : themeSetting.mode" />
                <t-empty v-else :title="$t('workbench.scriptAgent.noContent')" />
              </div>
            </t-tab-panel>
            <t-tab-panel :value="3" :label="$t('workbench.scriptAgent.script')">
              <div class="panelContent">
                <t-empty v-if="!planData.script?.length" :title="$t('workbench.scriptAgent.noContent')" />
                <div v-else class="scriptList">
                  <div
                    v-for="(item, index) in planData.script"
                    :key="getScriptCardKey(item, index)"
                    class="scriptCard"
                    :class="{ collapsed: isCardCollapsed(item, index) }">
                    <div class="scriptCardHeader">
                      <div class="scriptCardHeaderLeft">
                        <span class="scriptIndex">#{{ index + 1 }}</span>
                        <span class="scriptTitle">{{ item.name }}</span>
                      </div>
                      <div class="scriptCardActions">
                        <t-button size="small" variant="outline" @click="toggleCardCollapse(item, index)">
                          <template #icon>
                            <i-down v-if="!isCardCollapsed(item, index)" size="14" />
                            <i-right v-else size="14" />
                          </template>
                        </t-button>
                        <t-button size="small" :disabled="isGenerating" @click="editScript(index)">
                          <template #icon><i-edit size="14" /></template>
                        </t-button>
                        <t-button theme="danger" variant="outline" size="small" :disabled="isGenerating" @click="delScript(index)">
                          <template #icon><i-delete size="14" /></template>
                        </t-button>
                      </div>
                    </div>
                    <div class="scriptCardBody" v-if="!isCardCollapsed(item, index)">
                      <template v-if="isExplainerProject">
                        <StructuredScriptViewer v-if="structuredScripts[index]?.data" :script="structuredScripts[index].data" />
                        <div v-else class="scriptParseError" role="alert">
                          <strong>{{ $t("workbench.scriptAgent.invalidStructuredScript") }}</strong>
                          <p>{{ structuredScripts[index]?.error }}</p>
                        </div>
                      </template>
                      <template v-else>
                        <pre v-if="item.content">{{ item.content }}</pre>
                        <t-empty v-else :title="$t('workbench.scriptAgent.noContent')" />
                      </template>
                    </div>
                  </div>
                </div>
                <!-- 悬浮折叠按钮 -->
                <div class="floatCollapseBtn" v-if="planData.script?.length">
                  <t-button shape="circle" size="large" theme="primary" @click="toggleAllCards">
                    <template #icon>
                      <i-right v-if="isAllCollapsed" title="" size="18" />
                      <i-down v-else size="18" />
                    </template>
                  </t-button>
                </div>
              </div>
            </t-tab-panel>
          </t-tabs>
        </div>
      </Pane>
    </Splitpanes>
    <editMdPreivew v-model="dialogVisible" @save="onConfirm" :content="editContent" />

    <ScriptJsonEditor
      v-if="isExplainerProject"
      v-model:visible="scriptEditVisible"
      :model-value="scriptEditData.content"
      :busy="isGenerating || scriptSaveBusy"
      @save="saveScript" />

    <!-- 非科普项目继续使用原有 Markdown 编辑器。 -->
    <t-dialog
      v-else
      v-model:visible="scriptEditVisible"
      :header="$t('workbench.scriptAgent.editScript')"
      width="80%"
      top="10vh"
      placement="center"
      :confirm-btn="{ content: $t('workbench.scriptAgent.save'), theme: 'primary', disabled: isGenerating || scriptSaveBusy }"
      @confirm="saveScript(scriptEditData.content)"
      @close="scriptEditVisible = false">
      <div class="scriptEditForm">
        <div class="scriptEditField">
          <strong>{{ scriptEditData.name }}</strong>
        </div>
        <div class="scriptEditField">
          <label>{{ $t("workbench.scriptAgent.content") }}</label>
          <MdEditor
            v-model="scriptEditData.content"
            :theme="themeSetting.mode === 'auto' ? undefined : themeSetting.mode"
            :toolbars="toolbars"
            :footers="[]"
            style="height: 50vh"
            @onUploadImg="() => {}"
            @drop.prevent />
        </div>
      </div>
    </t-dialog>

    <!-- 可编辑重试：预填该轮用户消息原文，可改字后重发；不改字直接发送即原样重试 -->
    <t-dialog
      :visible="retryEditVisible"
      :header="$t('workbench.scriptAgent.retryEditTitle')"
      :footer="false"
      width="560px"
      @close="retryEditVisible = false">
      <t-textarea
        v-model="retryEditText"
        :autosize="{ minRows: 4, maxRows: 12 }"
        :placeholder="$t('workbench.scriptAgent.retryEditPlaceholder')" />
      <div class="f ac" style="justify-content: flex-end; gap: 10px; margin-top: 12px">
        <t-button variant="outline" :disabled="retryEditBusy" @click="retryEditVisible = false">
          {{ $t("workbench.scriptAgent.msg.cancel") }}
        </t-button>
        <t-button theme="primary" :loading="retryEditBusy" :disabled="!retryEditText.trim() || retryEditBusy" @click="confirmRetryEdit">
          {{ $t("workbench.scriptAgent.retryEditSend") }}
        </t-button>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { MdEditor } from "md-editor-v3";
import type { ToolbarNames } from "md-editor-v3";
import { MdPreview } from "md-editor-v3";
import settingStore from "@/stores/setting";
const { themeSetting } = storeToRefs(settingStore());
import { Splitpanes, Pane } from "splitpanes";
import axios from "@/utils/axios";
import type { ChatMessagesData } from "@tdesign-vue-next/chat";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
import editMdPreivew from "@/components/editMdPreivew.vue";
import scriptAgentStore from "@/stores/scriptAgent";
import PreflightPanel from "./components/PreflightPanel.vue";
import ScriptJsonEditor from "./components/ScriptJsonEditor.vue";
import StructuredScriptViewer from "./components/StructuredScriptViewer.vue";
import { buildPreflightAction } from "@/utils/preflight";
import type { PreflightAction } from "@/utils/preflight";
import { parseStructuredScriptJson } from "@/utils/structuredScript";
const route = useRoute();
const router = useRouter();
const { connected, messages, status, planData, thinkLevel, autoAdvance, isGenerating } = storeToRefs(scriptAgentStore());
const sessionAgentStore = scriptAgentStore();
const isExplainerProject = computed(() => project.value?.contentFormat === "explainer_video");
const structuredScripts = computed(() => {
  if (!isExplainerProject.value) return [];
  return (planData.value.script ?? []).map((item, index) => {
    try {
      return { item, index, data: parseStructuredScriptJson(item.content), error: "" };
    } catch (error) {
      return { item, index, data: null, error: error instanceof Error ? error.message : String(error) };
    }
  });
});
interface ImportBatch {
  id: number;
  name: string;
  chapterCount: number;
  scriptCount: number;
}
const MAINLINE_IMPORT = "mainline";
const queryNumber = (name: string) => {
  const value = Number(route.query[name]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};
const routeImportId = computed(() => queryNumber("importId"));
const selectedImportId = ref(routeImportId.value !== undefined ? String(routeImportId.value) : MAINLINE_IMPORT);
const importBatches = ref<ImportBatch[]>([]);
const importListLoading = ref(false);
/**
 * 主线 = 批次功能之前的遗留会话（作用域不带 importId，取材范围是项目全量）。
 * 项目一旦有了批次，主线和批次覆盖的是同一批原文，却各存一份骨架/策略/预审状态，
 * 留在下拉框里只会让人误选、误以为数据丢了。所以有批次时不再提供，
 * 只有当前会话本来就在主线上时保留该项，避免选择器显示空白。
 */
const showMainline = computed(() => !importBatches.value.length || selectedImportId.value === MAINLINE_IMPORT);
const routeScriptId = computed(() => queryNumber("scriptId"));
const routeMerge = computed(() => routeImportId.value !== undefined && route.query.merge === "1");
const scriptSessionParams = () => ({
  ...(routeImportId.value !== undefined ? { importId: routeImportId.value } : {}),
  ...(routeScriptId.value !== undefined ? { scriptId: routeScriptId.value } : {}),
});
const thinkLevelOptions = [
  { label: $t("workbench.scriptAgent.thinkLevel.off"), value: 0 },
  { label: $t("workbench.scriptAgent.thinkLevel.light"), value: 1 },
  { label: $t("workbench.scriptAgent.thinkLevel.deep"), value: 2 },
  { label: $t("workbench.scriptAgent.thinkLevel.extreme"), value: 3 },
];
const currentTable = ref(project.value?.contentFormat === "explainer_video" ? 0 : 1);
const draftKey = `scriptAgent-draft-${project.value?.id}-i${routeImportId.value ?? "main"}-s${routeScriptId.value ?? "main"}`;
const inputValue = ref(localStorage.getItem(draftKey) ?? "");
watch(inputValue, value => localStorage.setItem(draftKey, value));
const currentBatchName = computed(() => {
  if (selectedImportId.value === MAINLINE_IMPORT) return $t("workbench.scriptAgent.projectMainline");
  const batch = importBatches.value.find((item) => String(item.id) === selectedImportId.value);
  return batch?.name || $t("workbench.scriptAgent.unnamedBatch");
});
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
  getImportList();
  sessionAgentStore.connect();

  void getHistory();
});
async function getImportList() {
  importListLoading.value = true;
  try {
    const { data } = await axios.post("/novel/getImportList", { projectId: project.value?.id });
    importBatches.value = Array.isArray(data) ? data : [];
    // 未指定批次时默认进第一个批次，而不是落在主线上（工作台布局按 route.fullPath 做 key，replace 会重挂本页）
    if (routeImportId.value === undefined && routeScriptId.value === undefined && importBatches.value.length && project.value?.id) {
      await router.replace({ path: "/scriptAgent", query: { projectId: project.value.id, importId: String(importBatches.value[0].id) } });
    }
  } catch (e) {
    console.error("获取取材批次失败:", e);
    window.$message.error($t("workbench.scriptAgent.msg.importListFailed"));
  } finally {
    importListLoading.value = false;
  }
}

function handleBatchChange(value: string | number | boolean | unknown) {
  const nextValue = String(value);
  if (nextValue === MAINLINE_IMPORT) {
    router.push({ path: "/scriptAgent", query: { projectId: project.value?.id } });
    return;
  }
  const importId = Number(nextValue);
  if (!Number.isFinite(importId) || importId <= 0) return;
  router.push({
    path: "/scriptAgent",
    query: {
      projectId: project.value?.id,
      importId: String(importId),
    },
  });
}
onUnmounted(() => {
  sessionAgentStore.disconnect();
});
const agentWorkDataId = ref<number>();
async function getPlanData() {
  agentWorkDataId.value = await sessionAgentStore.getPlanData();
}

function handlePreflightAction(request: PreflightAction) {
  const action = buildPreflightAction(planData.value.preflight, request.type, request.findingIds, isGenerating.value || !connected.value);
  if (!action || action.reviewId !== request.reviewId || action.proposalId !== request.proposalId) return;
  const labels: Record<PreflightAction["type"], string> = {
    repair: "修复已选问题",
    confirm_diff: "确认差异并复审",
    ignore: "手动忽略全部问题并继续（包括红色问题）",
    confirm_commit: "确认差异并提交：跳过复审，直接用当前候选全文落预审凭据并进入提取",
    proceed: "继续下一步",
    discard: "放弃全部候选修改并重审原文",
  };
  sessionAgentStore.chat(labels[action.type], undefined, { preflightAction: action });
}

//快捷发送
const handleActions = {
  suggestion: (data?: any) => {
    if (isGenerating.value) return;
    scriptAgentStore().chat(data?.content?.prompt);
  },
};

function handleSend(text: string) {
  if (scriptAgentStore().chat(text)) {
    inputValue.value = "";
  }
}
function handleStop() {
  scriptAgentStore().stopGenerate();
}

/** 智能推进开关：开启后决策层代替用户确认并自动推进；若流程已启动且当前空闲，立即续跑 */
function toggleAutoAdvance() {
  const next = !autoAdvance.value;
  scriptAgentStore().updateAutoAdvance(next);
  const hasConversation = messages.value.some((m) => m.role === "user");
  // 最后一条消息是用户消息 = 有回合在途（首包前 isGenerating 尚为 false），此时补发续跑会触发后端 abort 杀掉当前回合
  const awaitingReply = messages.value[messages.value.length - 1]?.role === "user";
  if (next && hasConversation && connected.value && !isGenerating.value && !awaitingReply) {
    scriptAgentStore().autoAdvanceContinue();
  }
}

/**
 * 是否允许重试该消息：用户消息可重试；助手消息需前面紧邻一条用户消息；生成中禁用。
 * 忙判据必须用 isGenerating——status 只反映本页的流式状态，后台仍在跑或历史正在恢复时它是 idle，
 * 按钮会亮着但请求进不去，表现为点了没反应。
 */
function canRetry(message: ChatMessagesData): boolean {
  if (isGenerating.value) return false;
  const idx = messages.value.findIndex((m) => m.id === message.id);
  if (idx === -1) return false;
  if (message.role === "user") return true;
  return idx > 0 && messages.value[idx - 1].role === "user";
}

/** 可编辑重试状态：点重试弹编辑框，预填该轮用户消息原文；不改字发送=原样重试，改字发送=编辑后重试 */
const retryEditVisible = ref(false);
const retryEditText = ref("");
const retryTargetId = ref("");

const retryEditBusy = ref(false);

/** 把回退/重试的失败原因映射成可读提示 */
function rollbackErrorText(message?: string) {
  if (message === "generating") return $t("workbench.scriptAgent.rollbackBusy");
  if (message?.includes("没有可用的状态快照")) return $t("workbench.scriptAgent.rollbackNoSnapshot");
  return "";
}

/** 重试一轮对话：撤销该轮及其之后的内容，再重发用户输入（可编辑） */
function handleRetry(message: ChatMessagesData) {
  const idx = messages.value.findIndex((m) => m.id === message.id);
  if (idx === -1) return;
  const target = message.role === "user" ? message : messages.value[idx - 1];
  if (!target || target.role !== "user") return;
  const text = String((target.content?.[0] as any)?.data ?? "").trim();
  if (!text) return;
  retryTargetId.value = target.id;
  retryEditText.value = text;
  retryEditVisible.value = true;
}

/** 确认编辑后重试：成功才关弹窗，失败要说清楚原因，不能让用户以为已经发出去了 */
async function confirmRetryEdit() {
  const text = retryEditText.value.trim();
  if (!text || !retryTargetId.value || retryEditBusy.value) return;
  retryEditBusy.value = true;
  try {
    const res = await scriptAgentStore().retryFrom(retryTargetId.value, text);
    if (!res.ok) {
      window.$message.error(rollbackErrorText(res.message) || $t("workbench.scriptAgent.retryFailed"));
      return;
    }
    retryEditVisible.value = false;
    // 对话已在 store 里与库对齐，这里只需同步右侧工作区
    await getPlanData();
  } finally {
    retryEditBusy.value = false;
  }
}

/** 是否允许回退该消息：非欢迎语、非生成中；AI消息需其后还有内容（否则无可撤销项，最后一轮请用「重新生成」） */
function canRollback(message: ChatMessagesData): boolean {
  if (isGenerating.value) return false;
  if (message.id === "welcome") return false;
  const idx = messages.value.findIndex((m) => m.id === message.id);
  if (idx === -1) return false;
  if (message.role === "user") return true;
  return idx < messages.value.length - 1;
}

/** 回退到某条消息对应时刻的工作区状态，并截断其后对话 */
function handleRollback(message: ChatMessagesData) {
  const mode = message.role === "user" ? "discard" : "keep";
  // 回退前捕获将被截断范围的首条用户消息，回退成功后回填输入框（可改字重发，也可清空不用）
  const rbIdx = messages.value.findIndex((m) => m.id === message.id);
  let backfillText = "";
  if (rbIdx >= 0) {
    const removedUser =
      mode === "discard" && message.role === "user"
        ? message
        : messages.value.slice(rbIdx + 1).find((m) => m.role === "user");
    backfillText = String(((removedUser?.content?.[0] as any)?.data) ?? "").trim();
  }
  const dialog = DialogPlugin.confirm({
    header: $t(mode === "keep" ? "workbench.scriptAgent.rollbackKeepTitle" : "workbench.scriptAgent.rollbackDiscardTitle"),
    body: $t(mode === "keep" ? "workbench.scriptAgent.rollbackKeepBody" : "workbench.scriptAgent.rollbackDiscardBody"),
    confirmBtn: { content: $t("workbench.scriptAgent.rollbackConfirm"), theme: "warning" },
    cancelBtn: $t("workbench.scriptAgent.msg.cancel"),
    theme: "warning",
    onConfirm: async () => {
      if (isGenerating.value) return;
      dialog.destroy();
      const res = await scriptAgentStore().rollbackTo(message.id, mode);
      if (!res.ok) {
        window.$message.error(rollbackErrorText(res.message) || $t("workbench.scriptAgent.rollbackFailed"));
        return;
      }
      // 状态已回退：同步刷新右侧工作区数据，并按后端实际删掉的范围重新拉取对话
      await getPlanData();
      await getHistory();
      // 回填被回退轮次的用户消息到输入框，便于改字重发
      if (backfillText) inputValue.value = backfillText;
      window.$message.success($t("workbench.scriptAgent.rollbackSuccess"));
    },
  });
}

const memoryTypeLabel: Record<string, string> = {
  message: $t("workbench.scriptAgent.memoryType.message"),
  summary: $t("workbench.scriptAgent.memoryType.summary"),
  all: $t("workbench.scriptAgent.memoryType.all"),
};
function handleClearMemory(type: "message" | "summary" | "all" | "reconnect") {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.scriptAgent.msg.clearConfirm"),
    body: $t("workbench.scriptAgent.msg.clearBody", { type: memoryTypeLabel[type] }),
    confirmBtn: $t("workbench.scriptAgent.msg.confirmClear"),
    cancelBtn: $t("workbench.scriptAgent.msg.cancel"),
    theme: "warning",
    onConfirm: async () => {
      if (isGenerating.value) return;
      await axios.post(`/agents/clearMemory`, {
        projectId: project.value?.id,
        agentType: "scriptAgent",
        type,
        ...(routeScriptId.value !== undefined ? { episodesId: routeScriptId.value } : {}),
        ...(routeImportId.value !== undefined ? { importId: routeImportId.value } : {}),
      });
      window.$message.success($t("workbench.scriptAgent.msg.memoryCleared", { type: memoryTypeLabel[type] }));
      dialog.destroy();
      if (type !== "summary") { sessionAgentStore.clearMessages(); messages.value = [...defMsg]; }
      getHistory();
    },
  });
}
function handleResetConversation() {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.scriptAgent.resetConversation"),
    body: $t("workbench.scriptAgent.resetBody"),
    confirmBtn: $t("workbench.scriptAgent.clearAllMemory"),
    cancelBtn: $t("workbench.scriptAgent.msg.cancel"),
    theme: "danger",
    onConfirm: async () => {
      if (isGenerating.value) return;
      await axios.post(`/scriptAgent/resetConversation`, {
        projectId: project.value?.id,
        ...scriptSessionParams(),
        ...(routeImportId.value !== undefined ? { merge: routeMerge.value } : {}),
      });
      window.$message.success($t("workbench.scriptAgent.resetSuccess"));
      dialog.destroy();
      sessionAgentStore.clearMessages();
      messages.value = [...defMsg];
      getPlanData();
      getHistory();
    },
  });
}
function handleReconnect() {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.scriptAgent.msg.reconnect"),
    body: $t("workbench.scriptAgent.msg.notReconnect"),
    confirmBtn: $t("workbench.scriptAgent.msg.keepReconnect"),
    cancelBtn: $t("workbench.scriptAgent.msg.cancel"),
    theme: "warning",
    onConfirm: async () => {
      scriptAgentStore().reconnect();
      dialog.destroy();
    },
  });
}

const loadingHistory = computed(() => sessionAgentStore.loadingHistory);
async function getHistory() {
  try { await sessionAgentStore.getHistory(); }
  catch (error) { console.error('对话恢复失败', error); window.$message.error('对话恢复失败，请重新连接后重试'); }
}

// 强制生成蒙层
const forceGenerateVisible = ref(false);
const novelData = ref([]);

function getNovel() {
  axios.post("/novel/getNovelData", { projectId: project.value?.id }).then(({ data }: any) => {
    novelData.value = data;
    // 科普先预审、后提取事件，未分析章节不阻塞进入。
    if (project.value?.contentFormat === "explainer_video") {
      forceGenerateVisible.value = false;
      return;
    }
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
  if (isGenerating.value) return;
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
const scriptSaveBusy = ref(false);

function editScript(index: number) {
  if (isGenerating.value) return;
  const item = planData.value.script[index];
  scriptEditIndex.value = index;
  scriptEditData.value = {
    name: item.name,
    content: item.content,
  };
  scriptEditVisible.value = true;
}

function getSaveScriptErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { message?: unknown } } }).response;
  if (typeof response?.data?.message === "string" && response.data.message) return response.data.message;
  return error instanceof Error ? error.message : String(error);
}

async function saveScript(content: string) {
  if (isGenerating.value || scriptEditIndex.value < 0 || scriptSaveBusy.value) return;
  const nextScripts = planData.value.script.map((item, index) =>
    index === scriptEditIndex.value ? { ...item, content } : item,
  );
  scriptSaveBusy.value = true;
  try {
    await axios.post("/scriptAgent/setPlanData", {
      projectId: project.value?.id,
      agentType: "scriptAgent",
      data: {
        storySkeleton: planData.value.storySkeleton,
        adaptationStrategy: planData.value.adaptationStrategy,
        script: nextScripts,
      },
      ...scriptSessionParams(),
    });
    await getPlanData();
    window.$message.success($t("workbench.scriptAgent.msg.scriptUpdated"));
    scriptEditVisible.value = false;
  } catch (error) {
    window.$message.error($t("workbench.scriptAgent.saveFailedDraftKept", { message: getSaveScriptErrorMessage(error) }));
  } finally {
    scriptSaveBusy.value = false;
  }
}
async function delScript(index: number) {
  if (isGenerating.value) return;
  const item = planData.value.script[index];
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.scriptAgent.msg.deleteConfirm"),
    body: $t("workbench.scriptAgent.msg.deleteBody"),
    confirmBtn: $t("workbench.scriptAgent.msg.confirmDelete"),
    cancelBtn: $t("workbench.scriptAgent.msg.cancel"),
    theme: "danger",
    onConfirm: async () => {
      if (isGenerating.value) return;
      if (item.id) {
        await axios.post("/script/delScript", { ids: [item.id] });
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
  if (isGenerating.value) return;
  axios
    .post("/scriptAgent/updateData", {
      id: agentWorkDataId.value,
      data: {
        storySkeleton: currentTable.value == 1 ? value : planData.value.storySkeleton,
        adaptationStrategy: currentTable.value == 2 ? value : planData.value.adaptationStrategy,
        script: planData.value.script,
      },
    })
    .then(() => {
      window.$message.success($t("workbench.scriptAgent.msg.updated"));
      getPlanData();
    })
    .catch((err) => {
      window.$message.error(err?.message ?? $t("workbench.scriptAgent.msg.error"));
    });
}

const showThink = ref(false);
onMounted(async () => {
  const { data } = await axios.post(`/project/getModelDetails`, { key: "scriptAgent" });
  if (data && data.think) {
    showThink.value = true;
  }
});

type ScriptCardItem = {
  id?: number;
  name: string;
  content: string;
};

// 剧本卡片折叠状态
const collapsedCards = ref<Record<string, boolean>>({});

function getScriptCardKey(item: ScriptCardItem, index: number) {
  if (item.id !== undefined && item.id !== null) {
    return `id:${item.id}`;
  }
  return `index:${index}`;
}

function isCardCollapsed(item: ScriptCardItem, index: number) {
  return Boolean(collapsedCards.value[getScriptCardKey(item, index)]);
}

watch(
  () => planData.value.script?.map((item, index) => getScriptCardKey(item, index)) || [],
  (keys) => {
    const nextCollapsedCards: Record<string, boolean> = {};
    keys.forEach((key) => {
      if (collapsedCards.value[key]) {
        nextCollapsedCards[key] = true;
      }
    });
    collapsedCards.value = nextCollapsedCards;
  },
  { immediate: true },
);

// 是否全部折叠
const isAllCollapsed = computed(() => {
  if (!planData.value.script?.length) return false;
  return planData.value.script.every((item, index) => isCardCollapsed(item, index));
});

// 切换单个卡片折叠状态
function toggleCardCollapse(item: ScriptCardItem, index: number) {
  const key = getScriptCardKey(item, index);
  collapsedCards.value[key] = !collapsedCards.value[key];
}

// 一键折叠/展开所有卡片
function toggleAllCards() {
  const nextCollapsed = !isAllCollapsed.value;
  const nextCollapsedCards = { ...collapsedCards.value };
  planData.value.script?.forEach((item, index) => {
    nextCollapsedCards[getScriptCardKey(item, index)] = nextCollapsed;
  });
  collapsedCards.value = nextCollapsedCards;
}
</script>

<style lang="scss" scoped>
  .msgActions {
    display: flex;
    gap: 4px;
    padding: 2px 0;
    opacity: 0.55;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }

    &.isUser {
      justify-content: flex-end;
    }

    &.isAssistant {
      justify-content: flex-start;
    }
  }

  .box.isGenerating :deep(.t-chat__item__suggestion-item) {
    pointer-events: none;
    opacity: 0.45;
  }

  .scriptAgent {
  height: calc(100% - 16px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  .batchHeader {
    flex-shrink: 0;
    gap: 16px;
    min-height: 48px;
    padding: 8px 0;
    border-bottom: 1px solid var(--td-border-level-1-color);
    .batchSelector {
      gap: 10px;
      .batchLabel {
        font-size: 13px;
        font-weight: 500;
        color: var(--td-text-color-secondary);
      }
      .batchSelect {
        width: 280px;
      }
    }
    .currentBatchName {
      max-width: 360px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 600;
    }
  }
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
        border: 1px solid var(--td-border-level-1-color);
        background-color: var(--td-bg-color-container);
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
  position: relative;

  &::-webkit-scrollbar-thumb {
    background-color: var(--td-border-level-2-color);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-track {
    background-color: var(--td-bg-color-secondarycontainer);
  }
}

.scriptList {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.scriptCard {
  border: 1px solid var(--td-border-level-2-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--td-bg-color-container);
  display: flex;
  flex-direction: column;
  align-self: start;
  transition: box-shadow 0.2s ease;
  .scriptCardHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    background-color: var(--td-bg-color-secondarycontainer);
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
      background: var(--td-bg-color-component);
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
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: inherit;
    }
    .scriptParseError {
      padding: 12px;
      border: 1px solid var(--td-error-color);
      border-radius: 8px;
      color: var(--td-error-color);
      background: var(--td-error-color-1);
      overflow-wrap: anywhere;
      p {
        margin: 6px 0 0;
        white-space: pre-wrap;
      }
    }
  }
  .scriptCardFooter {
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid var(--td-border-level-1-color);
    background-color: var(--td-bg-color-secondarycontainer);
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
    background: var(--td-bg-color-secondarycontainer);
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
  background: var(--td-mask-active);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: 10px;
  .forceGenerateCard {
    background: var(--td-bg-color-container);
    border-radius: 12px;
    padding: 28px 32px 24px;
    max-width: 300px;
    width: 90%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
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
    &:hover {
      background-color: var(--td-bg-color-container-hover);
    }
    &.danger {
      color: var(--td-error-color);
    }
  }
}
.resetBar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px 4px;
}
:deep(.t-tabs__operations--right) {
  top: 0;
  bottom: 0;
}
:deep(.t-tabs__btn--right) {
  display: none;
}

// 悬浮折叠按钮样式
.floatCollapseBtn {
  position: fixed;
  right: 40px;
  bottom: 40px;
  z-index: 100;
  .t-button {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
  }
}

// 折叠状态样式
.scriptCard {
  &.collapsed {
    .scriptCardHeader {
      border-bottom: none;
    }
  }
}
</style>
