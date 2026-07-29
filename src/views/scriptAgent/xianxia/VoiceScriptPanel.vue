<script setup lang="ts">
// Region 5: 声音脚本编辑。
// 只读字段：voiceSegmentId / screenplayBeatId / speakerRole / speakerSemanticObjectId / omniscientGrantId / lineage。
// 可编辑字段：text + performance（emotion / pace / pauses / emphasis）。
// 修复 #5：草稿从「shown 版本 payload」初始化（不再始终清空）；提交时回写完整 VoiceScriptPayloadV1，
// 服务端用锁定基线覆盖只读字段并对齐 edit 字段（§24.3）。
import { computed, ref, watch } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import type { VoiceScriptVersion } from "@/types/screenplayPipeline";
import VoiceSegmentEditor from "./VoiceSegmentEditor.vue";

interface VoiceSegmentPerf {
  emotion: string | null;
  pace: "slow" | "normal" | "fast" | null;
  pauses: Array<{ afterText: string; strength: "short" | "medium" | "long" }>;
  emphasis: string[];
}
interface VoiceSegmentDraft {
  voiceSegmentId: string;
  text: string;
  performance: VoiceSegmentPerf;
}
interface VoiceScriptPayloadV1Dto {
  schemaVersion: "voice-script-v1";
  screenplayVersionId: string;
  segments: Array<{
    voiceSegmentId: string;
    order: number;
    screenplayBeatId: string;
    type: string;
    speakerRole: string;
    speakerSemanticObjectId: string | null;
    text: string;
    performance: VoiceSegmentPerf;
    estimatedDurationMs: number | null;
    omniscientGrantId: string | null;
    lineage: { splitFromId: string | null; mergedFromIds: string[]; replacesId: string | null; tombstone: boolean };
  }>;
  [key: string]: unknown;
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

// 修复 #5：从 shown 版本的 payload 初始化草稿（每个 segment 取可编辑字段 text/performance）。
// 版本或 contentHash 变化时才重建草稿，避免无谓清空用户编辑。
watch(
  () => [shown.value?.id, shown.value?.contentHash],
  () => {
    draftSegments.value = parseDraftSegments(shown.value);
    draftDirty.value = false;
  },
  { immediate: true },
);

function parseDraftSegments(version: VoiceScriptVersion | null): VoiceSegmentDraft[] {
  if (!version?.payload) return [];
  try {
    const parsed = JSON.parse(String(version.payload)) as VoiceScriptPayloadV1Dto;
    if (!Array.isArray(parsed.segments)) return [];
    return parsed.segments.map((s) => ({
      voiceSegmentId: s.voiceSegmentId,
      text: s.text,
      performance: {
        emotion: s.performance?.emotion ?? null,
        pace: s.performance?.pace ?? null,
        pauses: Array.isArray(s.performance?.pauses) ? s.performance!.pauses : [],
        emphasis: Array.isArray(s.performance?.emphasis) ? s.performance!.emphasis : [],
      },
    }));
  } catch {
    return [];
  }
}

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

// 修复 #5：用 shown 版本的完整 payload 作为基底，仅把草稿里的 text/performance 回写到匹配的
// voiceSegmentId；只读字段与 soundCues/beatCoverage/changeManifest 由后端对齐/重建。
async function onReviseSubmit(): Promise<void> {
  if (!reasonText.value.trim()) {
    MessagePlugin.warning("修订原因不能为空");
    return;
  }
  if (!shown.value?.payload) {
    MessagePlugin.error("缺少可修订的 voice payload");
    return;
  }
  let base: VoiceScriptPayloadV1Dto;
  try {
    base = JSON.parse(String(shown.value.payload)) as VoiceScriptPayloadV1Dto;
  } catch {
    MessagePlugin.error("voice payload 解析失败");
    return;
  }
  const byId = new Map(draftSegments.value.map((s) => [s.voiceSegmentId, s]));
  const segments = (Array.isArray(base.segments) ? base.segments : []).map((seg) => {
    const edit = byId.get(seg.voiceSegmentId);
    return edit ? { ...seg, text: edit.text, performance: edit.performance } : seg;
  });
  reasonDialog.value = false;
  emit("revise", { ...base, segments }, reasonText.value);
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
        <p>该版本暂无可编辑的 voice segment（payload 为空或解析失败）。生成或重做后将自动载入草稿。</p>
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
