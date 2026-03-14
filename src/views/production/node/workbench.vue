<template>
  <t-card class="workbench">
    <Handle :id="props.data.handleIds.target" type="target" :position="Position.Left" />
    <div class="titleBar">
      <div class="title">视频工作台</div>
      <t-tag theme="success" size="small">{{ props.data.status }}</t-tag>
    </div>
    <div class="videoPreview">
      <div class="videoPlaceholder" :style="{ background: props.data.gradient }">
        <t-image v-if="props.data.cover" :src="props.data.cover" fit="cover" class="videoCover" />
        <div class="playButton">
          <t-icon name="play-circle" size="48px" />
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
    <div class="actionBar">
      <t-button theme="primary" size="small">
        <template #icon><t-icon name="play" /></template>
        预览
      </t-button>
      <t-button variant="outline" size="small">
        <template #icon><t-icon name="download" /></template>
        导出
      </t-button>
      <t-button variant="outline" size="small">
        <template #icon><t-icon name="edit" /></template>
        编辑
      </t-button>
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

const props = defineProps<{
  id: string;
  data: {
    name: string;
    status: string;
    duration: string;
    resolution: string;
    fps: string;
    cover?: string;
    gradient?: string;
    handleIds: {
      target: string;
    };
  };
}>();
</script>

<style lang="scss" scoped>
.workbench {
  min-width: 280px;

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
    cursor: pointer;
    transition: transform 0.2s;

    &:hover {
      transform: scale(1.1);
    }
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

  .actionBar {
    display: flex;
    gap: 8px;
  }
}
</style>
