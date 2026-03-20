<template>
  <div class="uploadNode">
    <Handle type="source" :position="Position.Right" />
    <div class="data">
      <div class="title ac">
        <i-pic theme="outline" size="16" fill="#000000" />
        <span style="margin-left: 5px; color: #4b4b4b">Image</span>
      </div>
      <div class="imageBox">
        <t-image
          class="image"
          :src="currentImageUrl"
          fit="cover"
          :style="{
            width: '100%',
            height: '100%',
            borderRadius: '10px',
          }">
          <template #overlayContent>
            <div class="imageToolsWrap">
              <ImageTools :src="currentImageUrl" position="br" />
            </div>
          </template>
        </t-image>
        <div class="upload ac" @click="uploadFn">
          <i-upload theme="outline" size="18" fill="#fff" />
          <span style="margin-left: 5px; color: #fff">上传</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position, useVueFlow } from "@vue-flow/core";
import { onBeforeUnmount, ref, watch } from "vue";
import openAssetsSelector from "@/utils/assetsCheck";
const props = defineProps<{
  id: string;
  data: {
    image?: string;
  };
}>();

const currentImageUrl = ref(props.data?.image || "");
const currentObjectUrl = ref<string | null>(null);

watch(
  () => props.data?.image,
  (newUrl) => {
    currentImageUrl.value = newUrl || "";
  },
);

onBeforeUnmount(() => {
  if (currentObjectUrl.value) {
    URL.revokeObjectURL(currentObjectUrl.value);
  }
});

async function uploadFn() {
  const selectedAssets = await openAssetsSelector({
    multiple: false,
    title: "选择图片",
  });
  if (selectedAssets.length > 0) {
    currentImageUrl.value = selectedAssets[0].filePath!;
    console.log("%c Line:60 🌽 selectedAssets", "background:#7f2b82", selectedAssets);
  }
}
</script>

<style lang="scss" scoped>
.uploadNode {
  width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  .data {
    width: 100%;
    cursor: pointer;

    .title {
      height: 30px;
      padding: 5px;
    }
    .imageBox {
      border: 1px solid #e5e5e5;
      height: 320px;
      width: 100%;
      position: relative;
      border-radius: 10px;

      .image {
        .imageToolsWrap {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }

        &:hover {
          .imageToolsWrap {
            opacity: 1;
            pointer-events: auto;
          }
        }
      }

      .upload {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 9999;
        padding: 5px 10px;
        border-radius: 10px;
        background-color: rgba(0, 0, 0, 0.5);
      }
    }
  }
}
</style>
