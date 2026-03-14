<template>
  <t-card class="storyboardTable">
    <Handle :id="props.data.handleIds.target" type="target" :position="Position.Left" />
    <Handle :id="props.data.handleIds.source" type="source" :position="Position.Right" />
    <div class="title c">分镜表</div>
    <div class="content">
      <div class="storyboardList">
        <div v-for="(item, index) in props.data.items" :key="item.id" class="storyboardItem">
          <div class="itemTag" :style="{ backgroundColor: tagColors[index % tagColors.length] }">S{{ String(item.id).padStart(2, "0") }}</div>
          <div class="itemContent">
            <div class="itemTitle">{{ item.scene }} — {{ item.description }}</div>
            <div class="itemSubtitle">
              景别：{{ item.camera.split("，")[0] }} · 时长：{{ item.duration || "3s"
              }}{{ item.camera.includes("，") ? " · 运镜：" + item.camera.split("，").slice(1).join("，") : "" }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

interface StoryboardItem {
  id: number;
  scene: string;
  description: string;
  camera: string;
  duration?: string;
}

const props = defineProps<{
  id: string;
  data: {
    items: StoryboardItem[];
    handleIds: {
      target: string;
      source: string;
    };
  };
}>();

const tagColors = [
  "#9c7cfc",
  "#5b9afc",
  "#5bccb3",
  "#e8a855",
  "#e86b6b",
  "#7cb8fc",
  "#c97cfc",
];
</script>

<style lang="scss" scoped>
.storyboardTable {
  min-width: 400px;

  .title {
    background-color: #000;
    width: fit-content;
    padding: 5px 10px;
    color: #fff;
    border-radius: 8px 0;
    font-size: 16px;
  }

  .content {
    margin-top: 8px;
  }

  .storyboardList {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .storyboardItem {
    display: flex;
    align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid var(--td-border-level-1-color, #e7e7e7);

    &:last-child {
      border-bottom: none;
    }
  }

  .itemTag {
    flex-shrink: 0;
    width: 36px;
    height: 22px;
    border-radius: 4px;
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    margin-top: 2px;
  }

  .itemContent {
    flex: 1;
    min-width: 0;
  }

  .itemTitle {
    font-size: 14px;
    color: var(--td-text-color-primary, #333);
    line-height: 1.5;
    margin-bottom: 4px;
  }

  .itemSubtitle {
    font-size: 12px;
    color: var(--td-text-color-secondary, #999);
    line-height: 1.4;
  }
}
</style>
