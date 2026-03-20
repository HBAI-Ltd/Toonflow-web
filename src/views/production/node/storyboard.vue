<template>
  <t-card class="storyboard">
    <Handle :id="props.data.handleIds.target" type="target" :position="Position.Left" />
    <Handle :id="props.data.handleIds.source" type="source" :position="Position.Right" />
    <div class="titleBar dragHandle">
      <div class="title">分镜列表</div>
    </div>
    <div class="content">
      <div v-for="(group, groupIndex) in props.data.groups" :key="group.id" class="groupSection">
        <div class="groupHeader">
          {{ group.name }}
        </div>
        <div class="frameGrid">
          <div v-for="(frame, index) in group.frames" :key="`${group.id}-${frame.id}`" class="frameCard">
            <div
              class="frameImage"
              :style="{
                background: frame.gradient || getDefaultGradient(groupIndex * 10 + index),
                maxWidth: `${300 * gridScale}px`,
                maxHeight: `${300 * gridScale}px`,
              }">
              <t-tag v-if="frame.frameType" class="frameTypeTag" :style="{ backgroundColor: frame.frameType === '首帧' ? '#5bccb3' : '#e86b6b' }">
                {{ frame.frameType === "首帧" ? "首" : "尾" }}
              </t-tag>
              <t-tag class="frameTag" :style="{ backgroundColor: tagColors[(groupIndex * 10 + index) % tagColors.length] }">
                S{{ String(index + 1).padStart(2, "0") }}
              </t-tag>
              <t-image v-if="frame.image" :src="frame.image" fit="contain" class="frameImg" @click="visible = true">
                <template #overlayContent>
                  <div class="imageToolsWrap show">
                    <ImageTools :src="frame.image" position="br" />
                  </div>
                </template>
              </t-image>
            </div>
            <div class="frameInfo" :title="frame.description">{{ frame.description }}</div>
          </div>
        </div>
      </div>
      <div class="scaleControl">
        <span>缩放比例</span>
        <t-input-number v-model="gridScale" :min="0.1" :max="3" :step="0.1" :decimal-places="1" size="small" style="width: 120px" />
      </div>
      <t-button block @click="previewAll">宫格预览</t-button>
    </div>
    <editStoryboard v-model:visible="visible" v-if="visible" />
    <t-image-viewer v-model:visible="previewVisible" :images="previewImages" :imageScale="{ max: 10, min: 0.1 }" />
  </t-card>
</template>

<script setup lang="ts">
import { useLocalStorage } from "@vueuse/core";
import editStoryboard from "../components/editStoryboard/index.vue";
import { LoadingPlugin } from "tdesign-vue-next";
import { Handle, Position } from "@vue-flow/core";

interface Frame {
  id: number;
  description: string;
  image?: string;
  gradient?: string;
  frameType?: "首帧" | "尾帧";
  storyboardTableGroupId?: string;
  storyboardTableItemId?: number;
}

interface StoryboardGroup {
  id: string;
  name: string;
  frames: Frame[];
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

const visible = ref(false);
const previewVisible = ref(false);
const previewImages = ref<string[]>([]);
const gridScale = useLocalStorage("storyboardGridScale", 1);

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

async function previewAll() {
  LoadingPlugin(true);
  const allImages = props.data.groups.flatMap((g) => g.frames.filter((f) => f.image).map((f) => f.image!));
  if (!allImages.length) {
    window.$message.warning("没有可预览的图片");
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

  .groupSection {
    margin-bottom: 20px;

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
    margin-bottom: 12px;
  }

  .frameGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
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
    max-width: 300px;
    max-height: 300px;
    border-radius: 8px;
    overflow: hidden;
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
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
