<template>
  <t-card class="script">
    <div class="title c">剧本</div>
    <div class="block pr" :style="{ '--block-color': colors[index % colors.length] }" v-for="(item, index) in props.data.blocks" :key="item.id">
      <pre>{{ item.content }}</pre>
      <Handle :style="{ background: colors[index % colors.length] }" :id="props.data.handleIds.blocks[index]" type="source" :position="Position.Right" />
    </div>
    <Handle :id="props.data.handleIds.assets" type="source" :position="Position.Bottom" />
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

interface Block {
  id: string;
  content: string;
  connectTo: string | null;
}

const props = defineProps<{
  id: string;
  data: {
    blocks: Block[];
    handleIds: {
      assets: string;
      blocks: string[];
    };
  };
}>();

const colors = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa"];
</script>

<style lang="scss" scoped>
.script {
  min-width: 300px;
  width: fit-content;
  .title {
    background-color: #000;
    width: fit-content;
    padding: 5px 10px;
    color: #fff;
    border-radius: 8px 0;
    font-size: 16px;
  }
  .block {
    margin-top: 8px;
    padding: 12px;
    border: 1px solid color-mix(in srgb, var(--block-color) 50%, transparent);
    border-left: 4px solid var(--block-color);
    background-image: linear-gradient(150deg, color-mix(in srgb, var(--block-color) 1%, transparent), #fff);
    border-radius: 8px;
    pre {
      margin: 0;
      font-family: "Source Code Pro", monospace;
      line-height: 1.8;
      font-size: 14px;
      white-space: pre-wrap;
      :deep(.script-line) {
        display: block;
      }
      :deep(.line-note) {
        width: fit-content;
        background: color-mix(in srgb, var(--block-color) 18%, #fff);
        border-radius: 4px;
        padding: 0 4px;
      }
      :deep(.line-triangle) {
        opacity: 0.6;
      }
      :deep(.line-bracket) {
        background: color-mix(in srgb, var(--block-color) 25%, #fff);
        border-radius: 4px;
        padding: 0 4px;
      }
      :deep(.line-title) {
        text-decoration: underline;
        text-underline-offset: 2px;
      }
    }
  }
}
:deep(.source) {
  right: calc(var(--td-comp-paddingLR-xl) * -1 + -1px);
}
</style>
