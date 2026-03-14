<template>
  <t-card class="storyboard">
    <Handle :id="props.data.handleIds.target" type="target" :position="Position.Left" />
    <Handle :id="props.data.handleIds.source" type="source" :position="Position.Right" />
    <div class="title">分镜列表</div>
    <div class="content">
      <div class="frameGrid">
        <div v-for="(frame, index) in props.data.frames" :key="frame.id" class="frameCard">
          <div class="frameImage" :style="{ background: frame.gradient || getDefaultGradient(index) }">
            <t-tag class="frameTag" :style="{ backgroundColor: tagColors[index % tagColors.length] }">
              S{{ String(index + 1).padStart(2, "0") }}
            </t-tag>
            <t-image v-if="frame.image" :src="frame.image" fit="cover" class="frameImg" />
          </div>
          <div class="frameInfo">{{ frame.description }}</div>
        </div>
      </div>
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

interface Frame {
  id: number;
  description: string;
  image?: string;
  gradient?: string;
}

const props = defineProps<{
  id: string;
  data: {
    frames: Frame[];
    handleIds: {
      target: string;
      source: string;
    };
  };
}>();

const tagColors = ["#5bccb3", "#9c7cfc", "#fbbf24", "#5b9afc", "#e86b6b", "#7cb8fc", "#e8a855", "#34d399"];

const gradients = [
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  "linear-gradient(135deg, #c3cfe2 0%, #c3cfe2 100%)",
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
  "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)",
  "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
  "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",
  "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
];

const getDefaultGradient = (index: number) => gradients[index % gradients.length];
</script>

<style lang="scss" scoped>
.storyboard {
  min-width: 500px;

  .title {
    background-color: #000;
    width: fit-content;
    padding: 5px 10px;
    color: #fff;
    border-radius: 8px 0;
    font-size: 16px;
  }

  .content {
    margin-top: 12px;
  }

  .frameGrid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .frameCard {
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .frameImage {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    overflow: hidden;
  }

  .frameImg {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .frameTag {
    position: absolute;
    right: 8px;
    bottom: 8px;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    border: none;
  }

  .frameInfo {
    margin-top: 6px;
    font-size: 12px;
    color: var(--td-text-color-primary, #333);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
