<template>
  <div class="generatedNode">
    <Handle type="target" :position="Position.Left" />
    <div class="data" @click="selectedFn">
      <div class="title ac">
        <i-pic theme="outline" size="16" fill="#000000" />
        <span class="titleText">{{ $t("workbench.production.editImage.imageGeneration") }}</span>
      </div>
      <div class="image">
        <div v-if="generating" class="imageLoading">
          <div class="loadingSpinner"></div>
          <span class="loadingText">{{ $t("workbench.production.editImage.generating") }}</span>
        </div>
        <div v-else class="imageWrapper">
          <t-image class="image" :src="data.generatedImage" fit="contain" :class="['nodeImage', { selected }]">
            <template #overlayContent>
              <div class="imageToolsWrap">
                <ImageTools :src="data.generatedImage ?? ''" position="br" />
              </div>
            </template>
          </t-image>
        </div>
        <t-tooltip theme="primary" :content="$t('workbench.production.editImage.deleteNode')">
          <div class="remove ac" @click="removeNodes(props.id)">
            <i-delete theme="outline" size="18" fill="#fff" />
          </div>
        </t-tooltip>
      </div>
    </div>
    <div v-show="selected" class="parameter" @wheel.stop @mousedown.stop>
      <div class="imageRefs f w">
        <div v-for="(item, index) in data.references" :key="index" class="refThumb">
          <t-image :src="item.image" fit="cover" class="refImg" />
        </div>
      </div>
      <div class="text w">
        <PromptEditor v-model:prompt="data.prompt" :references="data.references" />
      </div>
      <div class="operate ac jb">
        <div class="ac">
          <modelSelect v-model="data.model" type="image" size="small" />
          <t-select v-model="data.ratio" class="paramSelect ml-5" size="small" :placeholder="$t('workbench.production.editImage.ratio')">
            <t-option value="16:9" label="16:9" />
            <t-option value="9:16" label="9:16" />
            <t-option value="1:1" label="1:1" />
          </t-select>
          <t-select v-model="data.quality" class="paramSelect ml-5" size="small" :placeholder="$t('workbench.production.editImage.quality')">
            <t-option value="1K" label="1K" />
            <t-option value="2K" label="2K" />
            <t-option value="4K" label="4K" />
          </t-select>
        </div>

        <div class="f" style="gap: 5px; margin-left: 5px">
          <t-popup :content="$t('workbench.production.editImage.generateBtn')">
            <t-button theme="primary" size="small" class="generateBtn" :disabled="generating" :loading="generating" @click="handleGenerate">
              <template #icon><i-arrow-up /></template>
            </t-button>
          </t-popup>
          <t-popup :content="$t('workbench.production.save')">
            <t-button theme="primary" size="small" class="keepBtn" :disabled="generating" :loading="generating" @click="handleKeep">
              <template #icon><i-save /></template>
            </t-button>
          </t-popup>
        </div>
      </div>
    </div>
    <Handle type="source" :position="Position.Right" style="z-index: 999999" />
  </div>
</template>

<script setup lang="ts">
import { Handle, useVueFlow, Position } from "@vue-flow/core";
import modelSelect from "@/components/modelSelect.vue";
import PromptEditor from "./promptEditor.vue";
import axios from "@/utils/axios";
import { type GeneratedNodeData } from "../../utils/editImageType";

const selected = ref(true);
const generating = ref(false);
const emit = defineEmits(["keep"]);
const { removeNodes } = useVueFlow({ id: "editImage" });

const props = defineProps<{
  id: string;
  data: GeneratedNodeData;
  projectId: number;
  imageDefaultModle: any;
}>();

function selectedFn() {
  selected.value = !selected.value;
}

// 生成
async function handleGenerate() {
  if (!props.data.model) return window.$message.error($t("workbench.production.editImage.selectModel"));
  if (!props.data.quality) return window.$message.error($t("workbench.production.editImage.selectQuality"));
  if (!props.data.ratio) return window.$message.error($t("workbench.production.editImage.selectRatio"));

  generating.value = true;
  try {
    const { data } = await axios.post("/production/editImage/generateFlowImage", {
      references: props.data.references.map((i) => i.image).filter(Boolean),
      model: props.data.model,
      quality: props.data.quality,
      ratio: props.data.ratio,
      prompt: props.data.prompt,
      projectId: props.projectId,
    });
    props.data.generatedImage = data.url;
  } catch (e) {
    return window.$message.error((e as any)?.message || $t("workbench.production.editImage.generateFailed"));
  } finally {
    generating.value = false;
  }
}

function handleKeep() {
  if (!props.data.generatedImage) return window.$message.error($t("workbench.production.editImage.generateFirst"));
  emit("keep", props.data.generatedImage);
}
onMounted(() => {
  console.log("%c Line:125 🍊", "background:#4fff4B", props.imageDefaultModle);
  if (props.imageDefaultModle) {
    props.data.model = props.imageDefaultModle?.imageModel ?? "";
    props.data.quality = props.imageDefaultModle?.imageQuality ?? "";
    props.data.ratio = "16:9";
  }
});
</script>

<style lang="scss" scoped>
.generatedNode {
  position: relative;
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

      .titleText {
        margin-left: 5px;
        color: #4b4b4b;
      }
    }

    .image {
      height: 320px;
      width: 100%;
      position: relative;
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
      .imageLoading {
        width: 100%;
        height: 100%;
        background-color: #e8e8e8;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;

        .loadingSpinner {
          width: 36px;
          height: 36px;
          border: 3px solid #d0d0d0;
          border-top-color: #5bccb3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loadingText {
          font-size: 14px;
          color: #666;
        }
      }

      .imageWrapper {
        position: relative;
        width: 100%;
        height: 100%;

        :deep(.nodeImage) {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          border: 3px solid transparent;
          box-sizing: border-box;

          &.selected {
            border-color: #000;
          }
        }
      }
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
  }

  .parameter {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 10px;
    width: 500px;
    height: 200px;
    border: 1px solid #d4d4d4;
    background-color: #fff;
    border-radius: 10px;
    z-index: 9999;

    .imageRefs {
      height: 50px;
      overflow: auto;
      padding: 10px;

      .refThumb {
        margin-left: 8px;
        .refImg {
          width: 45px;
          height: 45px;
          border-radius: 10px;
        }
      }
    }

    .text {
      height: 100px;
      display: flex;
      position: relative;
    }

    .operate {
      padding: 10px;
      height: 50px;

      .paramSelect {
        min-width: 100px;
        width: 100px;
      }

      .ml-5 {
        margin-left: 5px;
      }

      .generateBtn {
        margin-left: auto;
        --td-brand-color: #5bccb3;
        --td-brand-color-hover: #4ab8a0;
      }
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
