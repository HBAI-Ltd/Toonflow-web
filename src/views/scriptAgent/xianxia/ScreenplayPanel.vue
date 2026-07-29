<script setup lang="ts">
// Region 3: 剧本。Scene → Segment → Beat 只读展示。
// 修订使用深拷贝草稿，提交完整 ScreenplayPayloadV1 + expectedRowVersion + reason。
import { computed, ref, watch } from "vue";
import type { ArtifactVersion } from "@/types/screenplayPipeline";

interface ScreenplayBeatDto {
  beatId: string;
  order: number;
  type: string;
  speakerRole: string;
  speakerSemanticObjectId: string | null;
  text: string;
  emotion: string | null;
  intent: string | null;
  sourceFactRefs: unknown[];
  evidenceIds: string[];
  semanticObjectIds: string[];
  entityStates: unknown[];
  adaptationKind: string;
  adaptationNoteId: string | null;
  omniscientGrantId: string | null;
  lineage: { splitFromId: string | null; mergedFromIds: string[]; replacesId: string | null; tombstone: boolean };
}
interface ScreenplaySegmentDto {
  segmentId: string;
  order: number;
  beats: ScreenplayBeatDto[];
}
interface ScreenplaySceneDto {
  sceneId: string;
  order: number;
  title: string;
  segments: ScreenplaySegmentDto[];
}
interface ScreenplayPayloadV1 {
  schemaVersion: "screenplay-v1";
  adaptationDesignVersionId: string;
  scenes: ScreenplaySceneDto[];
  factCoverage: unknown[];
  boundaryNotes: unknown[];
  controlledExpansions: unknown[];
}

const props = defineProps<{
  projectId: number;
  episodeId: string;
  working: ArtifactVersion | null;
  active: ArtifactVersion | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: "regenerate", reason: string, subjectKind: "content" | "audit"): void;
  (e: "confirm", reason: string): void;
  (e: "revise", payload: ScreenplayPayloadV1, reason: string): void;
}>();

const shown = computed(() => props.working ?? props.active);
const draft = ref<ScreenplayPayloadV1 | null>(null);
const draftDirty = ref(false);

watch(
  shown,
  (v) => {
    // 不轻易创建 draft；只有用户明确编辑才进入 draft 模式。
    if (!v) {
      draft.value = null;
      draftDirty.value = false;
    }
  },
  { immediate: true },
);

function onRegenerate(): void {
  emit("regenerate", "用户在六区-3 触发重做", "content");
}

function onConfirm(): void {
  emit("confirm", "用户在六区-3 触发第一次确认");
}

function onRevise(): void {
  // 骨架：把 shell payload 草稿提交；真实场景由剧本编辑器填充。
  if (draft.value) {
    emit("revise", draft.value, "用户在六区-3 提交修订");
  }
}
</script>

<template>
  <div class="screenplayPanel">
    <div class="header">
      <span class="title">剧本</span>
      <div class="actions">
        <t-button size="small" variant="outline" :loading="loading" @click="onRegenerate">重做</t-button>
        <t-button size="small" theme="primary" :loading="loading" @click="onConfirm">第一次确认</t-button>
      </div>
    </div>
    <div v-if="!shown" class="empty">尚无剧本版本</div>
    <div v-else class="meta">
      <div class="metaRow">
        <span class="key">screenplayVersionId</span>
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
    </div>
    <div class="note">
      <p>Scene → Segment → Beat 渲染；Beat 类型 / 说话人 / 文本 / Fact / Evidence / StoryPoint / Cognition / Grant / Lineage。</p>
      <p>当前为骨架：完整剧本编辑器与 stress-mode 校验在后续迭代中实装。</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.screenplayPanel {
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
  .metaRow {
    display: flex;
    gap: 8px;
    padding: 4px 0;
    border-bottom: 1px solid var(--td-component-stroke, #f0f0f0);
    .key {
      width: 160px;
      color: var(--td-text-color-secondary, #666);
    }
    .val {
      word-break: break-all;
    }
  }
}
.note {
  margin-top: 16px;
  color: var(--td-text-color-secondary, #666);
  font-size: 12px;
  p {
    margin: 0 0 4px;
  }
}
</style>
