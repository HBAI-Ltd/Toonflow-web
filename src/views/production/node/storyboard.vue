<template>
  <t-card class="storyboard">
    <Handle :id="props.handleIds.target" type="target" :position="Position.Left" />
    <Handle :id="props.handleIds.source" type="source" :position="Position.Right" />
    <div class="titleBar dragHandle">
      <div class="title">分镜面板</div>
    </div>
    <div class="content">
      <div class="frameGrid">
        <template v-for="(item, index) in storyboard" :key="item.id">
          <div class="frameItem" @mouseenter="setHoveredFrame(index)" @mouseleave="setHoveredFrame(null)">
            <div
              class="addBetween addBetween--left"
              :class="{ expanded: hoveredIndex === index }"
              @click.stop="editStoryboaryImage([index > 0 ? storyboard[index - 1]?.src || '' : '', item.src || ''], null, index - 1)">
              <t-button theme="primary" variant="outline" shape="circle">
                <template #icon><i-plus /></template>
              </t-button>
            </div>

            <div class="frameCard">
              <div
                class="frameImage"
                :style="{
                  width: `${200 * gridScale}px`,
                  height: `${200 * gridScale}px`,
                }">
                <t-tag class="frameTypeTag" :style="{ backgroundColor: tagColors[index % tagColors.length] }">
                  S{{ String(index + 1).padStart(2, "0") }}
                </t-tag>
                <t-image v-if="item.src" :src="item.src" fit="contain" class="frameImg" @click="editStoryboaryImage([item.src], item.id)">
                  <template #overlayContent>
                    <div class="imageToolsWrap show">
                      <ImageTools :src="item.src" position="br" />
                    </div>
                  </template>
                </t-image>
                <div v-else class="generatingPlaceholder">
                  <t-loading v-if="item.state === '生成中'" size="small" />
                  <t-empty v-else size="small" title="未生成" />
                </div>
              </div>
              <div class="frameInfo" :title="item.description">{{ item.title }}</div>
            </div>
            <div
              class="addBetween addBetween--right"
              :class="{ expanded: hoveredIndex === index }"
              @click.stop="
                editStoryboaryImage([item.src || '', index < (storyboard?.length ?? 0) - 1 ? storyboard[index + 1]?.src || '' : ''], null, index)
              ">
              <t-button theme="primary" variant="outline" shape="circle">
                <template #icon><i-plus /></template>
              </t-button>
            </div>
          </div>
        </template>
      </div>
      <div class="scaleControl">
        <span>缩放比例</span>
        <t-input-number v-model="gridScale" :min="0.1" :max="3" :step="0.1" :decimal-places="1" size="small" style="width: 120px" />
      </div>
      <t-button block @click="previewAll">宫格预览</t-button>
    </div>
    <editImage v-model:visible="visible" v-if="visible" :editData="currentRow" type="storyboard" @save="save" />
    <t-image-viewer v-model:visible="previewVisible" :images="previewImages" :imageScale="{ max: 10, min: 0.1 }" />
  </t-card>
</template>

<script setup lang="ts">
import { useLocalStorage } from "@vueuse/core";
import editImage from "../components/editImage/index.vue";
import { LoadingPlugin } from "tdesign-vue-next";
import { Handle, Position, type Edge } from "@vue-flow/core";
import axios from "@/utils/axios";
import type { NodeType } from "../utils/editImageType";
interface Storyboard {
  id: number;
  title: string;
  description: string;
  camera: string;
  duration: number;
  prompt?: string;
  frameMode: "firstFrame" | "endFrame" | "linesSoundEffects";
  lines: string | null;
  sound: string | null;
  associateAssetsIds: number[];
  src: string | null;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
}

const props = defineProps<{
  id: string;
  handleIds: {
    target: string;
    source: string;
  };
}>();

const storyboard = defineModel<Storyboard[]>({ required: true });

const visible = ref(false);
const previewVisible = ref(false);
const previewImages = ref<string[]>([]);
const gridScale = useLocalStorage("storyboardGridScale", 1);

const hoveredIndex = ref<number | null>(null);

function setHoveredFrame(index: number | null) {
  hoveredIndex.value = index;
}

const currentRow = ref<{
  images: string[];
  id: number | null;
  insertAfterIndex: number | null;
}>({
  images: [],
  id: null,
  insertAfterIndex: null,
});

const tagColors = ["#5bccb3", "#9c7cfc", "#fbbf24", "#5b9afc", "#e86b6b", "#7cb8fc", "#e8a855", "#34d399"];

async function previewAll() {
  LoadingPlugin(true);
  const allImages = (storyboard.value ?? []).filter((s) => s.src).map((s) => s.src!);
  if (!allImages.length) {
    window.$message.warning("没有可预览的图片");
    LoadingPlugin(false);
    return;
  }

  try {
    const loaded = await Promise.all(
      allImages.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`加载失败: ${src}`));
            img.src = src;
          }),
      ),
    );

    const cols = Math.min(5, loaded.length);
    const rows = Math.ceil(loaded.length / cols);

    const colWidths: number[] = Array(cols).fill(0);
    const rowHeights: number[] = Array(rows).fill(0);
    loaded.forEach((img, idx) => {
      const c = idx % cols;
      const r = Math.floor(idx / cols);
      colWidths[c] = Math.max(colWidths[c], img.width);
      rowHeights[r] = Math.max(rowHeights[r], img.height);
    });

    const canvas = document.createElement("canvas");
    canvas.width = colWidths.reduce((a, b) => a + b, 0);
    canvas.height = rowHeights.reduce((a, b) => a + b, 0);
    const ctx = canvas.getContext("2d")!;

    let globalIndex = 0;
    for (let r = 0; r < rows; r++) {
      let x = 0;
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= loaded.length) break;
        const y = rowHeights.slice(0, r).reduce((a, b) => a + b, 0);
        ctx.drawImage(loaded[idx], x, y);
        // 左上角绘制分镜标号
        const label = `S${String(globalIndex + 1).padStart(2, "0")}`;
        const fontSize = Math.max(14, Math.min(loaded[idx].width, loaded[idx].height) * 0.06);
        ctx.font = `bold ${fontSize}px Arial`;
        const textMetrics = ctx.measureText(label);
        const padding = fontSize * 0.4;
        const bgW = textMetrics.width + padding * 2;
        const bgH = fontSize + padding * 2;
        ctx.beginPath();
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.roundRect(x + 4, y + 4, bgW, bgH, 4);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.textBaseline = "top";
        ctx.fillText(label, x + 4 + padding, y + 4 + padding);
        globalIndex++;
        x += colWidths[c];
      }
    }

    previewImages.value = [canvas.toDataURL("image/png")];
    previewVisible.value = true;
  } catch {
    window.$message.error("图片加载失败，无法生成预览");
  } finally {
    LoadingPlugin(false);
  }
}

function editStoryboaryImage(images: string[], id: number | null = null, insertAfterIndex: number | null = null) {
  currentRow.value = {
    images: images.filter(Boolean),
    id,
    insertAfterIndex,
  };
  visible.value = true;
}

async function save({ imageUrl, insertId }: { imageUrl: string; insertId: number }) {
  if (!imageUrl) return;

  const { id, insertAfterIndex } = currentRow.value;

  // 插入模式：在两张图之间新增一条分镜
  if (id === null && insertAfterIndex !== null) {
    const newId = insertId;
    const newFrame: Storyboard = {
      id: newId,
      title: "",
      description: "",
      camera: "",
      duration: 0,
      prompt: "",
      frameMode: "firstFrame",
      lines: null,
      sound: null,
      associateAssetsIds: [],
      src: imageUrl,
      state: "已完成",
    };
    storyboard.value.splice(insertAfterIndex + 1, 0, newFrame);
    return;
  }

  // 更新模式：更新对应分镜的 src
  const target = storyboard.value.find((s) => s.id === id);
  if (target) target.src = imageUrl;
}
</script>

<style lang="scss" scoped>
.storyboard {
  min-width: 500px;
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

  .content {
    margin-top: 12px;
  }

  .frameGrid {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0;
  }

  .frameItem {
    position: relative;
    display: inline-flex;
    align-items: flex-start;
    margin: 4px;
  }

  .addBetween {
    position: absolute;
    z-index: 10;
    top: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    span {
      line-height: 1;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    &.expanded {
      opacity: 1;
      pointer-events: auto;
    }
    &:hover {
      // background: var(--td-brand-color);
      // color: #fff;
      // transform: scale(1.15);
    }
    &--left {
      transform: translate(calc(-50% - 4px), -50%);
    }
    &--right {
      transform: translate(calc(50% + 4px), -50%);
      right: 0;
    }
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
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .generatingPlaceholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background-color: var(--td-bg-color-container-hover, #f5f5f5);
    font-size: 12px;
  }

  .frameImg {
    width: 100%;
    height: 100%;
    object-fit: cover;
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

  .frameTypeTag {
    position: absolute;
    left: 6px;
    top: 6px;
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    border: none;
    z-index: 2;
    padding: 0 4px;
    line-height: 18px;
    border-radius: 3px;
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

  .scaleControl {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--td-text-color-primary, #333);
  }

  .frameInfo {
    margin-top: 6px;
    font-size: 12px;
    color: var(--td-text-color-primary, #333);
    line-height: 1.4;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
:deep(.t-image__wrapper) {
  background-color: transparent !important;
}
</style>
