<script setup lang="ts">
// 单个 Voice Segment 编辑器：
// 只允许编辑 text + performance（emotion / pace / pauses / emphasis）；
// screenplayBeatId / speakerRole / speakerSemanticObjectId / omniscientGrantId 只读。
import { computed } from "vue";

interface VoicePerformance {
  emotion: string | null;
  pace: "slow" | "normal" | "fast" | null;
  pauses: Array<{ afterText: string; strength: "short" | "medium" | "long" }>;
  emphasis: string[];
}

interface VoiceSegmentDraft {
  voiceSegmentId: string;
  text: string;
  performance: VoicePerformance;
}

const props = defineProps<{
  segment: VoiceSegmentDraft;
  readonlySpeaker: { role: string | null; semanticObjectId: string | null; beatId: string; grantId: string | null };
}>();

const emit = defineEmits<{
  (e: "update", next: VoiceSegmentDraft): void;
}>();

const text = computed({
  get: () => props.segment.text,
  set: (v: string) => emit("update", { ...props.segment, text: v }),
});

const emotion = computed({
  get: () => props.segment.performance.emotion,
  set: (v: string | null) =>
    emit("update", {
      ...props.segment,
      performance: { ...props.segment.performance, emotion: v || null },
    }),
});

const pace = computed({
  get: () => props.segment.performance.pace,
  set: (v: "slow" | "normal" | "fast" | null) =>
    emit("update", {
      ...props.segment,
      performance: { ...props.segment.performance, pace: v },
    }),
});

const emphasisCsv = computed({
  get: () => props.segment.performance.emphasis.join(","),
  set: (v: string) =>
    emit("update", {
      ...props.segment,
      performance: {
        ...props.segment.performance,
        emphasis: v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    }),
});

function onPauseAdd(): void {
  emit("update", {
    ...props.segment,
    performance: {
      ...props.segment.performance,
      pauses: [...props.segment.performance.pauses, { afterText: "", strength: "short" }],
    },
  });
}

function onPauseRemove(idx: number): void {
  emit("update", {
    ...props.segment,
    performance: {
      ...props.segment.performance,
      pauses: props.segment.performance.pauses.filter((_, i) => i !== idx),
    },
  });
}

function onPauseUpdate(idx: number, patch: Partial<{ afterText: string; strength: "short" | "medium" | "long" }>): void {
  emit("update", {
    ...props.segment,
    performance: {
      ...props.segment.performance,
      pauses: props.segment.performance.pauses.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    },
  });
}
</script>

<template>
  <div class="voiceSegmentEditor">
    <div class="readonly">
      <div class="readonlyRow">
        <span class="key">voiceSegmentId</span>
        <span class="val">{{ segment.voiceSegmentId }}</span>
      </div>
      <div class="readonlyRow">
        <span class="key">screenplayBeatId</span>
        <span class="val">{{ readonlySpeaker.beatId }}</span>
      </div>
      <div class="readonlyRow">
        <span class="key">speaker (role/object)</span>
        <span class="val">{{ readonlySpeaker.role ?? "—" }} / {{ readonlySpeaker.semanticObjectId ?? "—" }}</span>
      </div>
      <div class="readonlyRow">
        <span class="key">omniscientGrantId</span>
        <span class="val">{{ readonlySpeaker.grantId ?? "—" }}</span>
      </div>
    </div>

    <div class="field">
      <label>text</label>
      <t-textarea v-model="text" :autosize="{ minRows: 2, maxRows: 6 }" />
    </div>

    <div class="row2">
      <div class="field">
        <label>emotion</label>
        <t-input :value="emotion ?? ''" @change="(v: any) => (emotion = v ? String(v) : null)" placeholder="可选" />
      </div>
      <div class="field">
        <label>pace</label>
        <t-select
          :value="pace ?? undefined"
          placeholder="可选"
          clearable
          @change="(v: any) => (pace = v ? (v as 'slow' | 'normal' | 'fast') : null)">
          <t-option label="slow" value="slow" />
          <t-option label="normal" value="normal" />
          <t-option label="fast" value="fast" />
        </t-select>
      </div>
    </div>

    <div class="field">
      <label>emphasis (逗号分隔)</label>
      <t-input v-model="emphasisCsv" placeholder="如：他,她" />
    </div>

    <div class="field">
      <label>pauses</label>
      <div class="pauseList">
        <div v-for="(p, idx) in segment.performance.pauses" :key="idx" class="pauseRow">
          <t-input
            :value="p.afterText"
            placeholder="afterText"
            @change="(v: any) => onPauseUpdate(idx, { afterText: String(v) })" />
          <t-select
            :value="p.strength"
            @change="(v: any) => onPauseUpdate(idx, { strength: v as 'short' | 'medium' | 'long' })">
            <t-option label="short" value="short" />
            <t-option label="medium" value="medium" />
            <t-option label="long" value="long" />
          </t-select>
          <t-button size="small" variant="outline" theme="danger" @click="onPauseRemove(idx)">删除</t-button>
        </div>
        <t-button size="small" variant="outline" @click="onPauseAdd">+ pause</t-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.voiceSegmentEditor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--td-component-stroke, #e7e7e7);
  border-radius: 4px;
  background: var(--td-bg-color-container, #fff);
}
.readonly {
  background: var(--td-bg-color-component, #f7f7f7);
  padding: 8px;
  border-radius: 4px;
  .readonlyRow {
    display: flex;
    gap: 8px;
    font-size: 12px;
    .key {
      width: 160px;
      color: var(--td-text-color-secondary, #666);
    }
    .val {
      word-break: break-all;
      font-family: monospace;
    }
  }
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  label {
    font-size: 12px;
    color: var(--td-text-color-secondary, #666);
  }
}
.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.pauseList {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pauseRow {
  display: grid;
  grid-template-columns: 1fr 120px 80px;
  gap: 8px;
  align-items: center;
}
</style>
