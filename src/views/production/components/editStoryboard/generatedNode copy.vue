<template>
  <t-card class="generatedNode">
    <Handle type="target" :position="Position.Left" />

    <!-- 标题栏 -->
    <div class="header">
      <div class="title">
        <i-pic theme="outline" size="16" />
        <span>图片处理</span>
      </div>
      <div class="toolbar">
        <i-full-screen-one theme="outline" size="18" class="toolbarIcon" />
        <i-download theme="outline" size="18" class="toolbarIcon" />
      </div>
    </div>

    <!-- 生成的图片 -->
    <div class="content">
      <div class="generatedImageWrapper">
        <img v-if="data.generatedImage" :src="data.generatedImage" class="generatedImage" />
        <div v-else class="placeholder">等待生成</div>
        <t-tag v-if="data.generatedImage" class="imageTag">生成结果</t-tag>
      </div>

      <!-- 参考图缩略图 -->
      <div class="referenceThumbnails" v-if="data.references?.length">
        <div v-for="(ref, index) in data.references" :key="index" class="thumbnailItem">
          <img :src="ref.image" class="thumbnail" />
          <t-tag class="thumbnailTag" :style="{ backgroundColor: tagColors[index % tagColors.length] }">
            {{ index + 1 }}
          </t-tag>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="inputArea">
        <t-textarea v-model="data.prompt" placeholder="描述你想要的效果..." :autosize="{ minRows: 2, maxRows: 4 }" />
      </div>

      <!-- 参数设置 -->
      <div class="paramsArea">
        <t-select v-model="data.model" class="paramSelect" size="small" placeholder="模型">
          <t-option value="banana-pro" label="Banana Pro" />
          <t-option value="other" label="Other" />
        </t-select>
        <t-select v-model="data.ratio" class="paramSelect" size="small" placeholder="比例">
          <t-option value="16:9" label="16:9" />
          <t-option value="9:16" label="9:16" />
          <t-option value="1:1" label="1:1" />
        </t-select>
        <t-select v-model="data.quality" class="paramSelect" size="small" placeholder="质量">
          <t-option value="1K" label="1K" />
          <t-option value="2K" label="2K" />
        </t-select>
        <t-button theme="primary" size="small" class="generateBtn" @click="handleGenerate">
          <template #icon><i-arrow-up /></template>
        </t-button>
      </div>
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

const props = defineProps<{
  id: string;
  data: {
    generatedImage?: string;
    references?: { image: string }[];
    prompt?: string;
    model?: string;
    ratio?: string;
    quality?: string;
    steps?: number;
  };
}>();

const emit = defineEmits<{
  generate: [id: string];
}>();

const tagColors = ["#5bccb3", "#9c7cfc", "#fbbf24", "#5b9afc", "#e86b6b"];

const handleGenerate = () => {
  emit("generate", props.id);
};
</script>

<style lang="scss" scoped>
.generatedNode {
  min-width: 380px;
  max-width: 420px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;

    .title {
      display: flex;
      align-items: center;
      gap: 6px;
      background-color: #000;
      width: fit-content;
      padding: 5px 10px;
      color: #fff;
      border-radius: 8px 0;
      font-size: 14px;
    }

    .toolbar {
      display: flex;
      gap: 8px;

      .toolbarIcon {
        color: #666;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;

        &:hover {
          color: #333;
          background: #f0f0f0;
        }
      }
    }
  }

  .content {
    .generatedImageWrapper {
      position: relative;
      margin-bottom: 12px;
      border-radius: 8px;
      overflow: hidden;

      .generatedImage {
        width: 100%;
        display: block;
      }

      .placeholder {
        width: 100%;
        height: 200px;
        background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 14px;
      }

      .imageTag {
        position: absolute;
        right: 8px;
        bottom: 8px;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        border: none;
      }
    }

    .referenceThumbnails {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;

      .thumbnailItem {
        position: relative;

        .thumbnail {
          width: 50px;
          height: 50px;
          border-radius: 6px;
          object-fit: cover;
        }

        .thumbnailTag {
          position: absolute;
          bottom: 2px;
          right: 2px;
          color: #fff;
          font-size: 10px;
          padding: 0 4px;
          min-width: 16px;
          height: 16px;
          line-height: 16px;
          border: none;
        }
      }
    }

    .inputArea {
      margin-bottom: 12px;
    }

    .paramsArea {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;

      .paramSelect {
        width: 100px;
      }

      .stepCount {
        color: #666;
        font-size: 12px;
        margin-left: auto;
      }

      .generateBtn {
        --td-brand-color: #5bccb3;
        --td-brand-color-hover: #4ab8a0;
      }
    }
  }
}

// :deep(.target) {
//   left: calc(var(--td-comp-paddingLR-xl) * -1 + -1px);
// }
</style>
