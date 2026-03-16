<template>
  <t-card class="uploadNode">
    <div class="title">
      <i-upload-one theme="outline" size="16" />
      <span>上传</span>
    </div>
    <div class="content">
      <div class="imageWrapper">
        <img v-if="data.image" :src="data.image" class="previewImage" />
        <div v-else class="placeholder">暂无图片</div>
      </div>
    </div>
    <Handle type="source" :position="Position.Right" />
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

defineProps<{
  id: string;
  data: {
    image?: string;
  };
}>();
</script>

<style lang="scss" scoped>
.uploadNode {
  min-width: 200px;

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

  .content {
    margin-top: 12px;

    .imageWrapper {
      border-radius: 8px;
      overflow: hidden;

      .previewImage {
        width: 100%;
        max-width: 280px;
        display: block;
        object-fit: cover;
      }

      .placeholder {
        width: 200px;
        height: 150px;
        background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 14px;
      }
    }
  }
}

// :deep(.source) {
//   right: calc(var(--td-comp-paddingLR-xl) * -1 + -1px);
// }
</style>
