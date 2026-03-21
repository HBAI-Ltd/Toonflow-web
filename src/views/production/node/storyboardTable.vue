<template>
  <t-card class="storyboardTable">
    <Handle :id="props.data.handleIds.target" type="target" :position="Position.Left" />
    <Handle :id="props.data.handleIds.source" type="source" :position="Position.Right" />
    <div class="titleBar dragHandle">
      <div class="title c">分镜表</div>
    </div>
    <div class="storyboardList">
      <div v-for="(item, index) in props.data.groups" :key="item.id" class="storyboardItem">
        <div class="itemTag" :style="{ backgroundColor: tagColors[index % tagColors.length] }">
          S{{ String(item.id).padStart(2, '0') }}
        </div>
        <div class="itemContent">
          <div class="itemHeader">
            <div class="itemTitle">{{ item.title }} — {{ item.description }}</div>
            <div class="itemTags">
              <t-tag size="small" theme="warning">{{ item.duration }}s</t-tag>
              <t-popup :content="item.frameMode" theme="light" placement="top">
                <t-tag size="small" theme="success">{{ item.frameMode }}</t-tag>
              </t-popup>
              <t-popup v-if="item.associateAssetsIds.length" :content="item.associateAssetsIds.join('，')" theme="light" placement="top">
                <t-tag size="small" theme="primary">角</t-tag>
              </t-popup>
            </div>
          </div>
          <div class="itemDetail">
            <span>景别：{{ item.camera }}</span>
            <template v-if="item.lines">
              <span class="sep">|</span>
              <span>台词：{{ item.lines }}</span>
            </template>
            <template v-if="item.sound">
              <span class="sep">|</span>
              <span>音效：{{ item.sound }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

interface StoryboardTableItem {
  id: number;
  title: string;
  description: string;
  camera: string;
  duration: number;
  frameMode: "firstFrame" | "endFrame" | "linesSoundEffects";
  lines: string | null;
  sound: string | null;
  associateAssetsIds: number[];
}

const props = defineProps<{
  id: string;
  data: {
    groups: StoryboardTableItem[];
    handleIds: {
      target: string;
      source: string;
    };
  };
}>();

const tagColors = ["#9c7cfc", "#5b9afc", "#5bccb3", "#e8a855", "#e86b6b", "#7cb8fc", "#c97cfc"];
</script>

<style lang="scss" scoped>
.storyboardTable {
  max-width: 40vw;
  width: fit-content;
  min-width: 300px;
  user-select: text;
  cursor: default;

  .titleBar {
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

  .storyboardList {
    display: flex;
    flex-direction: column;
    margin-top: 8px;
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

  .itemHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .itemTags {
    display: flex;
    gap: 5px;
    flex-shrink: 0;
    margin-left: 12px;
  }

  .itemTitle {
    font-size: 14px;
    color: var(--td-text-color-primary, #333);
    line-height: 1.5;
  }

  .itemDetail {
    font-size: 12px;
    color: var(--td-text-color-secondary, #999);
    line-height: 1.4;

    .sep {
      margin: 0 6px;
      color: var(--td-border-level-1-color, #ddd);
    }
  }
}
</style>
