<template>
  <t-card class="workbench" @click="visible = !visible">
    <div class="titleBar dragHandle pr">
      <div class="title">{{ $t("workbench.production.node.workbench.title") }}</div>
      <Handle :id="props.handleIds.target" type="target" :position="Position.Left" style="left: calc(-1 * var(--td-comp-paddingLR-xl))" />
      <!-- <Handle :id="props.handleIds.source" type="source" :position="Position.Right" /> -->
    </div>
    <div class="videoPreview">
      <div class="videoPlaceholder" :style="{ background: workbenchData?.gradient }">
        <t-image v-if="workbenchData?.cover" :src="workbenchData.cover" fit="cover" class="videoCover" />
        <div class="playButton">
          <i-video theme="outline" size="48" />
        </div>
      </div>
      <!-- <div class="videoInfo">
        <div class="videoName">{{ workbenchData?.name }}</div>
        <div class="videoMeta">
          <span>{{ workbenchData?.duration }}</span>
          <span class="divider">|</span>
          <span>{{ workbenchData?.resolution }}</span>
          <span class="divider">|</span>
          <span>{{ workbenchData?.fps }}</span>
        </div>
      </div> -->
    </div>
    <workbench v-model:visible="visible" v-if="visible" />
  </t-card>
</template>

<script setup lang="ts">
import workbench from "../components/workbench/index.vue";
import { Handle, Position } from "@vue-flow/core";

const visible = ref(false);

interface WorkbenchData {
  name: string;
  duration: string;
  resolution: string;
  fps: string;
  cover?: string;
  gradient?: string;
}

const props = defineProps<{
  id: string;
  handleIds: {
    target: string;
    source: string;
  };
}>();

const workbenchData = defineModel<WorkbenchData>({ required: true });
</script>

<style lang="scss" scoped>
.workbench {
  cursor: pointer;
  min-width: 280px;
  user-select: text;
  transition: filter 0.1s;
  &:hover {
    .playButton {
      transform: scale(1.1);
    }
  }
  &:active {
    filter: brightness(0.9);
  }

  .titleBar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    cursor: grab;
    user-select: none;
  }

  .title {
    background-color: #000;
    width: fit-content;
    padding: 5px 10px;
    color: #fff;
    border-radius: 8px 0;
    font-size: 16px;
  }

  .videoPreview {
    margin-bottom: 12px;
  }

  .videoPlaceholder {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    overflow: hidden;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .videoCover {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .playButton {
    position: absolute;
    color: rgba(255, 255, 255, 0.9);
    transition: transform 0.2s;
  }

  .videoInfo {
    margin-top: 8px;
  }

  .videoName {
    font-size: 14px;
    font-weight: 600;
    color: var(--td-text-color-primary, #333);
    margin-bottom: 4px;
  }

  .videoMeta {
    font-size: 12px;
    color: var(--td-text-color-secondary, #666);

    .divider {
      margin: 0 6px;
      color: var(--td-border-level-1-color, #ddd);
    }
  }
}
</style>
