<template>
  <t-card class="workbench" @click="visible = !visible">
    <Handle :id="props.data.handleIds.target" type="target" :position="Position.Left" />
    <Handle :id="props.data.handleIds.source" type="source" :position="Position.Right" />
    <div class="titleBar">
      <div class="title">视频工作台</div>
    </div>
    <div class="videoPreview">
      <div class="videoPlaceholder" :style="{ background: props.data.gradient }">
        <t-image v-if="props.data.cover" :src="props.data.cover" fit="cover" class="videoCover" />
        <div class="playButton">
          <i-video theme="outline" size="48" />
        </div>
      </div>
      <div class="videoInfo">
        <div class="videoName">{{ props.data.name }}</div>
        <div class="videoMeta">
          <span>{{ props.data.duration }}</span>
          <span class="divider">|</span>
          <span>{{ props.data.resolution }}</span>
          <span class="divider">|</span>
          <span>{{ props.data.fps }}</span>
        </div>
      </div>
    </div>
    <workbench v-model:visible="visible" v-if="visible" />
  </t-card>
</template>

<script setup lang="ts">
import workbench from "../components/workbench/index.vue";
import { Handle, Position } from "@vue-flow/core";

const visible = ref(false);

const props = defineProps<{
  id: string;
  data: {
    name: string;
    duration: string;
    resolution: string;
    fps: string;
    cover?: string;
    gradient?: string;
    handleIds: {
      target: string;
      source: string;
    };
  };
}>();
</script>

<style lang="scss" scoped>
.workbench {
  cursor: pointer;
  min-width: 280px;
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
