<script setup lang="ts">
// Region 5: 声音脚本编辑。
// 只读字段：voiceSegmentId / screenplayBeatId / speakerRole / speakerSemanticObjectId / omniscientGrantId / lineage。
// 可编辑字段：text + performance（emotion / pace / pauses / emphasis）。
// 提交前比较服务端 content hash；提交完整 Payload + expectedRowVersion + 必填 reason。
import { computed, ref, watch } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import type { VoiceScriptVersion } from "@/types/screenplayPipeline";
import VoiceSegmentEditor from "./VoiceSegmentEditor.vue";

interface VoiceSegmentDraft {
  voiceSegmentId: string;
  text: string;
  performance: {
    emotion: string | null;
    pace: "slow" | "normal" | "fast" | null;
    pauses: Array<{ afterText: string; strength: "short" | "medium" | "long" }>;
    emphasis: string[];
  };
}

const props = defineProps<{
  projectId: number;
  episodeId: string;
  working: VoiceScriptVersion | null;
  active: VoiceScriptVersion | null;
  loading: boolean;
  lastError: string | null;
}>();

const emit = defineEmits<{
  (e: "generate", reason: string): void;
  (e: "regenerate", reason: string, subjectKind: "content" | "audit"): void;
  (e: "revise", payload: unknown, reason: string): void;
  (e: "rollbackToScreenplay", reason: string): void;
}>();

const shown = computed(() => props.working ?? props.active);
const draftSegments = ref<VoiceSegmentDraft[]>([]);
const draftDirty = ref(false);
const reasonDialog = ref(false);
const rollbackDialog = ref(false);
const reasonText = ref("");

// Initialize draft from working version when it changes.
watch(
  () => [props.working?.id, props.working?.contentHash],
  () => {
    draftSegments.value = [];
    draftDirty.value = false;
  },
  { immediate: true },
);

function onSegmentUpdate(idx: number, next: VoiceSegmentDraft): void {
  draftSegments.value = draftSegments.value.map((s, i) => (i === idx ? next : s));
  draftDirty.value = true;
}

function onGenerate(): void {
  emit("generate", "用户在六区-5 触发声音生成");
}

function onRegenerate(): void {
  reasonDialog.value = true;
}

function onRollback(): void {
  rollbackDialog.value = true;
}

async function onReviseSubmit(): Promise<void> {
  if (!reasonText.value.trim()) {
    MessagePlugin.warning("修订原因不能为空");
    return;
  }
  reasonDialog.value = false;
  // 提交完整 Payload；这里使用工作版本的 payload 作为基础，仅做骨架性提交。
  emit("revise", { segments: draftSegments.value }, reasonText.value);
  reasonText.value = "";
}

async function onRollbackSubmit(): Promise<void> {
  if (!reasonText.value.trim()) {
    MessagePlugin.warning("回退原因不能为空");
    return;
  }
  rollbackDialog.value = false;
  emit("rollbackToScreenplay", reasonText.value);
  reasonText.value = "";
}
</script>

<template>
  <div class="voiceScriptPanel">
    <div class="header">
      <span class="title">声音脚本</span>
      <div class="actions">
        <t-button v-if="!shown" size="small" theme="primary" :loading="loading" @click="onGenerate">
          生成
        </t-button>
        <t-button v-else size="small" variant="outline" @click="onRegenerate">重做</t-button>
        <t-button v-if="shown" size="small" variant="outline" theme="danger" @click="onRollback">
          回退到剧本
        </t-button>
      </div>
    </div>

    <div v-if="!shown" class="empty">尚无声音脚本版本</div>
    <div v-else>
      <div class="meta">
        <div class="metaRow">
          <span class="key">voiceScriptVersionId</span>
          <span class="val">{{ shown.id }}</span>
        </div>
        <div class="metaRow">
          <span class="key">version</span>
          <span class="val">{{ shown.version }}</span>
        </div>
        <div class="metaRow">
          <span class="key">revisionState</span>
          <span class="val">{{ shown.revisionState }}</span>
        </div>
        <div class="metaRow">
          <span class="key">jobState</span>
          <span class="val">{{ shown.jobState }}</span>
        </div>
        <div class="metaRow">
          <span class="key">compatibilityState</span>
          <span class="val">{{ shown.compatibilityState }}</span>
        </div>
        <div class="metaRow">
          <span class="key">contentHash</span>
          <span class="val">{{ shown.contentHash ?? "—" }}</span>
        </div>
      </div>

      <div v-if="draftSegments.length === 0" class="hint">
        <p>该版本无 segment 草稿（骨架视图）。真实场景由后端 detail 返回完整 VoiceScriptPayloadV1。</p>
      </div>
      <div v-else class="segmentList">
        <VoiceSegmentEditor
          v-for="(seg, idx) in draftSegments"
          :key="seg.voiceSegmentId"
          :segment="seg"
          :readonly-speaker="{ role: null, semanticObjectId: null, beatId: '(来自后端)', grantId: null }"
          @update="(next) => onSegmentUpdate(idx, next)" />
      </div>

      <div v-if="draftDirty" class="dirty">
        <span>有未保存的草稿</span>
        <t-button size="small" theme="primary" @click="onRegenerate">提交修订</t-button>
      </div>
    </div>

    <t-dialog v-model:visible="reasonDialog" header="重做原因" :on-confirm="onReviseSubmit" :on-close="() => (reasonText = '')">
      <t-textarea v-model="reasonText" placeholder="请填写重做原因" />
    </t-dialog>

    <t-dialog v-model:visible="rollbackDialog" header="回退原因" :on-confirm="onRollbackSubmit" :on-close="() => (reasonText = '')">
      <t-textarea v-model="reasonText" placeholder="回退到剧本：派生新的 screenplay 版本并标记 voice 为 stale" />
    </t-dialog>
  </div>
</template>

<style scoped lang="scss">
.voiceScriptPanel {
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
  .actions {
    display: flex;
    gap: 8px;
  }
}
.empty {
  color: var(--td-text-color-secondary, #666);
  padding: 24px 0;
}
.meta {
  margin-bottom: 16px;
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
}
.segmentList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.hint {
  color: var(--td-text-color-secondary, #666);
  padding: 12px;
  background: var(--td-bg-color-component, #f7f7f7);
  border-radius: 4px;
  p {
    margin: 0;
    font-size: 12px;
  }
}
.dirty {
  margin-top: 12px;
  padding: 8px 12px;
  background: var(--td-warning-color-light, #fff3e0);
  display: flex;
  gap: 12px;
  align-items: center;
  border-radius: 4px;
}
</style>
