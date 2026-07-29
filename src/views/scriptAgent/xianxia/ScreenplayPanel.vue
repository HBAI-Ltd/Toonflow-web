<script setup lang="ts">
// Region 3: 剧本。Scene → Segment → Beat 只读展示（修复 #5：实现真实渲染，去掉骨架占位）。
// 修订提交完整 ScreenplayPayloadV1（解析自 shown.payload）+ expectedRowVersion + reason。
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
  [key: string]: unknown;
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

// 解析 shown 版本的 payload，供 Scene → Segment → Beat 渲染。
const parsed = computed<ScreenplayPayloadV1 | null>(() => {
  if (!shown.value?.payload) return null;
  try {
    const p = JSON.parse(String(shown.value.payload));
    if (p && Array.isArray(p.scenes)) return p as ScreenplayPayloadV1;
    return null;
  } catch {
    return null;
  }
});

const sceneCount = computed(() => parsed.value?.scenes.length ?? 0);

// 切换版本时清空脏标记；draft 在用户实际编辑时由编辑器填充（当前为只读渲染 + 整包 round-trip 修订）。
const draftDirty = ref(false);
watch(
  shown,
  (v) => {
    if (!v) {
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

// 修复 #5：提交完整 payload（解析自 shown），使修订流程可用；服务端用锁定基线对齐只读字段。
function onRevise(): void {
  if (!parsed.value) {
    return;
  }
  emit("revise", { ...parsed.value }, "用户在六区-3 提交修订");
}
</script>

<template>
  <div class="screenplayPanel">
    <div class="header">
      <span class="title">剧本</span>
      <div class="actions">
        <t-button size="small" variant="outline" :loading="loading" @click="onRegenerate">重做</t-button>
        <t-button size="small" variant="outline" :loading="loading" :disabled="!parsed" @click="onRevise">提交修订</t-button>
        <t-button size="small" theme="primary" :loading="loading" @click="onConfirm">第一次确认</t-button>
      </div>
    </div>
    <div v-if="!shown" class="empty">尚无剧本版本</div>
    <div v-else>
      <div class="meta">
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
        <div class="metaRow">
          <span class="key">scenes</span>
          <span class="val">{{ sceneCount }}</span>
        </div>
      </div>

      <div v-if="!parsed" class="note">
        <p>该剧本版本暂无可渲染的 payload（骨架数据）。生成或重做后将在此展示 Scene → Segment → Beat。</p>
      </div>
      <div v-else class="tree">
        <section v-for="scene in parsed.scenes" :key="scene.sceneId" class="scene">
          <h4 class="sceneTitle">
            <span class="order">#{{ scene.order }}</span>
            {{ scene.title }}
            <span class="sceneId">{{ scene.sceneId }}</span>
          </h4>
          <div v-for="segment in scene.segments" :key="segment.segmentId" class="segment">
            <div class="segmentHead">
              <span class="segOrder">Seg {{ segment.order }}</span>
              <span class="segId">{{ segment.segmentId }}</span>
              <span class="beatCount">{{ segment.beats.length }} beats</span>
            </div>
            <ul class="beatList">
              <li v-for="beat in segment.beats" :key="beat.beatId" class="beat">
                <span class="beatType" :class="`bt-${beat.type}`">{{ beat.type }}</span>
                <span class="beatSpeaker">{{ beat.speakerRole }}<template v-if="beat.speakerSemanticObjectId"> · {{ beat.speakerSemanticObjectId }}</template></span>
                <span class="beatText">{{ beat.text }}</span>
                <span v-if="beat.emotion" class="beatEmotion">情绪:{{ beat.emotion }}</span>
                <span v-if="beat.omniscientGrantId" class="beatGrant">grant:{{ beat.omniscientGrantId }}</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
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
