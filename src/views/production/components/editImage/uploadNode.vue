<template>
  <div class="uploadNode">
    <Handle type="source" :position="Position.Right" style="z-index: 999999" />
    <div class="data">
      <div class="title ac">
        <i-pic theme="outline" size="16" fill="#000000" />
        <span style="margin-left: 5px; color: #4b4b4b">Image</span>
      </div>
      <div class="imageBox">
        <t-image
          class="image"
          :src="currentImageUrl"
          fit="contain"
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
        <t-dropdown :options="options" @click="clickHandler">
          <div class="upload ac">
            <i-upload theme="outline" size="18" fill="#fff" />
            <span style="margin-left: 5px; color: #fff">{{ $t("workbench.production.editImage.upload") }}</span>
          </div>
          <template #content>
            <div class="fc ac" style="gap: 6px">
              <t-button variant="outline" @click="uploadFn">资产图片</t-button>
              <t-button variant="outline" @click="getStoryboardImage">分镜图片</t-button>
            </div>
          </template>
        </t-dropdown>

        <t-tooltip theme="primary" :content="$t('workbench.production.editImage.deleteNode')">
          <div class="remove ac" @click="removeFn">
            <i-delete theme="outline" size="18" fill="#fff" />
          </div>
        </t-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position, useVueFlow } from "@vue-flow/core";
import { onBeforeUnmount, ref, watch } from "vue";
import openAssetsSelector from "@/utils/assetsCheck";
import type { Storyboard } from "../../utils/flowBuilder";
import type { DropdownOption } from "tdesign-vue-next/es/dropdown";
const props = defineProps<{
  id: string;
  data: {
    image?: string;
  };
}>();
const openStoryboardCheck = inject<() => Promise<Storyboard[]>>("openStoryboardCheck")!;

const { updateNodeData, removeNodes } = useVueFlow({ id: "editImage" });
const currentImageUrl = ref(props.data?.image || "");
const currentObjectUrl = ref<string | null>(null);

const options = [
  { content: $t("workbench.production.editImage.uploadImage"), value: 1 },
  { content: $t("workbench.production.editImage.uploadStoryboardImage"), value: 2 },
];

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

function removeFn() {
  removeNodes(props.id);
}
const emit = defineEmits(["upload"]);

function clickHandler(data: DropdownOption) {
  if (data.value == 1) {
    uploadFn();
  } else if (data.value == 2) {
    getStoryboardImage();
  }
}
async function uploadFn() {
  const selectedAssets = await openAssetsSelector({
    multiple: false,
    title: $t("workbench.production.editImage.selectImage"),
  });
  if (selectedAssets.length > 0) {
    const filePath = selectedAssets[0].src!;
    currentImageUrl.value = filePath;
    updateNodeData(props.id, { image: filePath });
    emit("upload");
  }
}
async function getStoryboardImage() {
  const rows = await openStoryboardCheck();
  if (rows.length > 0) {
    const filePath = rows[0].src!;
    currentImageUrl.value = filePath;
    updateNodeData(props.id, { image: filePath });
    emit("upload");
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
        left: 10px;
        z-index: 9999;
        padding: 5px 10px;
        border-radius: 10px;
        background-color: rgba(0, 0, 0, 0.5);
      }

      .remove {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 9999;
        padding: 5px;
        border-radius: 10px;
        background-color: rgba(220, 50, 50, 0.7);
        cursor: pointer;
        &:hover {
          background-color: rgba(220, 50, 50, 1);
        }
      }
    }
  }
}
</style>
