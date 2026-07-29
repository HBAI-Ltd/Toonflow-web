<script setup lang="ts">
// Region 2: 改编设计。只读展示当前 working 或 active Adaptation Version，附带生成按钮。
import { computed } from "vue";
import type { ArtifactVersion } from "@/types/screenplayPipeline";

const props = defineProps<{
  projectId: number;
  episodeId: string;
  working: ArtifactVersion | null;
  active: ArtifactVersion | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: "generate", reason: string): void;
}>();

const shown = computed(() => props.working ?? props.active);

function onGenerate(): void {
  emit("generate", "用户在六区-2 触发改编生成");
}
</script>

<template>
  <div class="adaptationPanel">
    <div class="header">
      <span class="title">改编设计</span>
      <t-button size="small" theme="primary" :loading="loading" @click="onGenerate">
        生成
      </t-button>
    </div>
    <div v-if="!shown" class="empty">尚无改编版本</div>
    <div v-else class="meta">
      <div class="metaRow">
        <span class="key">版本 ID</span>
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
        <span class="key">compatibilityState</span>
        <span class="val">{{ shown.compatibilityState }}</span>
      </div>
      <div class="metaRow">
        <span class="key">contentHash</span>
        <span class="val">{{ shown.contentHash ?? "—" }}</span>
      </div>
    </div>
    <div class="note">
      <p>改编设计在此区域展示完整 payload（premise / protagonistArc / opening / progression / climax / hook / requiredFactRefs / boundaryNotes / controlledExpansions / continuityPlan）。</p>
      <p>当前为骨架：调用方可在后续迭代中替换为 TDesign 表单与 RichViewer 渲染。</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.adaptationPanel {
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
      width: 140px;
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
