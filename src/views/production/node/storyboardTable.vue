<template>
  <t-card class="storyboardTable">
    <Handle :id="props.data.handleIds.target" type="target" :position="Position.Left" />
    <Handle :id="props.data.handleIds.source" type="source" :position="Position.Right" />
    <div class="title c">分镜表</div>
    <div class="content">
      <div v-for="(group, groupIndex) in props.data.groups" :key="group.id" class="groupSection">
        <div class="groupHeader">{{ group.name }}</div>
        <div class="storyboardList">
          <div v-for="(item, index) in group.items" :key="`${group.id}-${item.id}`" class="storyboardItem">
            <div class="itemTag" :style="{ backgroundColor: tagColors[(groupIndex * 10 + index) % tagColors.length] }">
              S{{ String(item.id).padStart(2, "0") }}
            </div>
            <div class="itemContent">
              <div class="jb ac">
                <div class="itemTitle">{{ item.scene }} — {{ item.description }}</div>
                <div>
                  <t-tag size="small" theme="warning" style="cursor: pointer">{{ item.duration || "3s" }}</t-tag>
                  <t-popup :content="item.frameMode" theme="light" placement="top">
                    <t-tag size="small" theme="success" style="margin-left: 5px; cursor: pointer">{{ item.frameMode }}</t-tag>
                  </t-popup>
                  <t-popup :content="item.role.join('，')" theme="light" placement="top">
                    <t-tag size="small" theme="primary" style="margin-left: 5px; cursor: pointer">角</t-tag>
                  </t-popup>
                </div>
              </div>
              <div class="itemSubtitle">
                景别：{{ item.camera.split("，")[0] }}
                {{ item.camera.includes("，") ? " -- 运镜：" + item.camera.split("，").slice(1).join("，") : "" }} -- 情绪目的：{{
                  item.mooPurpose
                }}
                -- 运镜：{{ item.luck }} -- 首帧描述：{{ item.firstFrameDescribe }} -- 尾帧描述：{{ item.endFrameDescription }} -- 台词/音效：{{
                  item.linesSoundEffects
                }}
              </div>
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
  frameMode: string;
  mooPurpose: string;
  luck: string;
  firstFrameDescribe: string;
  endFrameDescription: string;
  linesSoundEffects: string;
  role: string[];
}

interface StoryboardGroup {
  id: string;
  name: string;
  blockId: string;
  items: StoryboardItem[];
}

const props = defineProps<{
  id: string;
  data: {
    groups: StoryboardGroup[];
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
  max-width: 100vw;
  width: fit-content;
  min-width: 300px;

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

  .groupSection {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .groupHeader {
    font-size: 14px;
    font-weight: 600;
    color: var(--td-text-color-primary, #333);
    padding: 8px 0;
    border-bottom: 2px solid var(--td-brand-color, #0052d9);
    margin-bottom: 8px;
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
