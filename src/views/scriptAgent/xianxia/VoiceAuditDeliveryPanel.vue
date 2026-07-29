<script setup lang="ts">
// Region 6: 第二次审核 + Stage 3 交付摘要。
// 包含：Voice Audit 分组、Change Manifest、第二次确认、Delivery 摘要。
import { computed, ref } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import type { Stage2EpisodeDetail } from "@/types/screenplayPipeline";

const props = defineProps<{
  projectId: number;
  detail: Stage2EpisodeDetail;
}>();

const emit = defineEmits<{
  (e: "confirmVoice", reason: string): void;
}>();

const delivery = ref<unknown | null>(null);
const deliveryLoading = ref(false);
const deliveryError = ref<string | null>(null);
const confirmDialog = ref(false);
const confirmReason = ref("");

async function loadDelivery(): Promise<void> {
  if (props.detail.listStatus !== "stage2-complete") return;
  deliveryLoading.value = true;
  deliveryError.value = null;
  try {
    const { screenplayPipelineApi } = await import("@/api/screenplayPipeline");
    delivery.value = await screenplayPipelineApi.stage2Delivery(props.detail.episode.id, props.projectId);
  } catch (cause: any) {
    deliveryError.value = String(cause?.message ?? cause);
  } finally {
    deliveryLoading.value = false;
  }
}

async function onConfirmOpen(): Promise<void> {
  confirmDialog.value = true;
  confirmReason.value = "";
}

async function onConfirmSubmit(): Promise<void> {
  if (!confirmReason.value.trim()) {
    MessagePlugin.warning("确认原因不能为空");
    return;
  }
  confirmDialog.value = false;
  emit("confirmVoice", confirmReason.value);
}

const voiceAudits = computed(() => props.detail.latestAudits.filter((a) => a.subjectType === "voice-script"));
const changeManifest = computed(() => {
  const voice = props.detail.workingVoice ?? props.detail.activeVoice;
  if (!voice) return null;
  // payload 通过 detail API 已经包含完整 VoiceScriptPayloadV1（解构后由后端投影）。
  // 这里只能从 detail 顶层取 manifest：服务实现需要在 detail 投影包含 changeManifest 字段。
  return (voice as any).changeManifest ?? null;
});

function severityClass(sev: string): string {
  switch (sev) {
    case "blocker":
      return "sev blocker";
    case "confirm":
      return "sev confirm";
    case "warning":
      return "sev warning";
    default:
      return "sev info";
  }
}
</script>

<template>
  <div class="auditDeliveryPanel">
    <div class="header">
      <span class="title">第二次审核 / 交付</span>
      <t-button size="small" theme="primary" :loading="detail.listStatus !== 'stage2-complete'" @click="onConfirmOpen">
        第二次确认
      </t-button>
    </div>

    <section>
      <h3>Voice Audit</h3>
      <div v-if="voiceAudits.length === 0" class="empty">尚未运行 Voice Audit</div>
      <ul v-else class="auditList">
        <li v-for="a in voiceAudits" :key="a.id">
          <div class="auditHeader">
            <span>auditId: {{ a.id }}</span>
            <span class="auditMeta">inputFp: {{ a.inputFingerprint }}</span>
          </div>
          <div class="auditHeader">
            <span>prompt: {{ a.promptVersion }}</span>
            <span>modelConfig: {{ a.modelConfigFingerprint }}</span>
          </div>
        </li>
      </ul>
    </section>

    <section>
      <h3>Change Manifest</h3>
      <div v-if="!changeManifest" class="empty">无 change manifest</div>
      <div v-else>
        <div class="metaRow">
          <span class="key">aggregateType</span>
          <span class="val">{{ changeManifest.aggregateType }}</span>
        </div>
        <ul class="manifestList">
          <li v-for="(c, i) in changeManifest.changes" :key="i" :class="severityClass(c.type)">
            <span class="code">{{ c.type }}</span>
            <span class="src">{{ c.source }}</span>
            <span class="msg">beats: {{ c.affectedBeatIds.length }} / segments: {{ c.affectedVoiceSegmentIds.length }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section>
      <h3>第二次确认</h3>
      <div class="confirmForm">
        <div class="metaRow">
          <span class="key">voiceScriptVersionId</span>
          <span class="val">{{ detail.episode.activeVoiceScriptVersionId ?? "—" }}</span>
        </div>
        <div class="metaRow">
          <span class="key">compatibilityState</span>
          <span class="val">{{ detail.activeVoice?.compatibilityState ?? "—" }}</span>
        </div>
        <div class="metaRow">
          <span class="key">currentSecondApproval</span>
          <span class="val">{{ detail.currentSecondApproval?.approvalId ?? "—" }}</span>
        </div>
      </div>
    </section>

    <section>
      <h3>Stage 2 Delivery</h3>
      <div v-if="detail.listStatus !== 'stage2-complete'" class="empty">当前 listStatus 不是 stage2-complete</div>
      <div v-else>
        <t-button size="small" variant="outline" :loading="deliveryLoading" @click="loadDelivery">
          加载 Delivery
        </t-button>
        <div v-if="deliveryError" class="empty error">{{ deliveryError }}</div>
        <pre v-else-if="delivery" class="deliveryJson">{{ JSON.stringify(delivery, null, 2) }}</pre>
      </div>
    </section>

    <t-dialog v-model:visible="confirmDialog" header="第二次确认" :on-confirm="onConfirmSubmit" :on-close="() => (confirmReason = '')">
      <t-textarea v-model="confirmReason" placeholder="请填写确认原因" />
    </t-dialog>
  </div>
</template>

<style scoped lang="scss">
.auditDeliveryPanel {
  padding: 16px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  .title {
    font-weight: 600;
  }
}
h3 {
  margin: 16px 0 8px;
  font-size: 14px;
  border-top: 1px solid var(--td-component-stroke, #e7e7e7);
  padding-top: 16px;
}
.empty {
  color: var(--td-text-color-secondary, #666);
  padding: 12px 0;
  &.error {
    color: var(--td-error-color, #d54941);
  }
}
.auditList {
  list-style: none;
  margin: 0;
  padding: 0;
}
.auditHeader {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--td-text-color-secondary, #666);
}
.metaRow {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid var(--td-component-stroke, #f0f0f0);
  font-size: 13px;
  .key {
    width: 160px;
    color: var(--td-text-color-secondary, #666);
  }
  .val {
    word-break: break-all;
  }
}
.manifestList {
  list-style: none;
  margin: 8px 0;
  padding: 0;
  li {
    display: flex;
    gap: 8px;
    padding: 4px 8px;
    border-left: 3px solid var(--td-component-stroke, #e7e7e7);
    margin-bottom: 4px;
    .code {
      font-family: monospace;
    }
    .src {
      font-size: 12px;
      color: var(--td-text-color-secondary, #666);
    }
  }
  .sev.blocker {
    background: #fde7e7;
    color: #d54941;
  }
  .sev.confirm {
    background: #fff3e0;
    color: #c2671f;
  }
  .sev.warning {
    background: #fff8e6;
    color: #b88400;
  }
  .sev.info {
    background: #e6f4ff;
    color: #0052d9;
  }
}
.deliveryJson {
  max-height: 320px;
  overflow: auto;
  background: var(--td-bg-color-component, #f7f7f7);
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
}
</style>
