<template>
  <div class="viewport" ref="viewportRef" :style="viewportStyle" @mousedown="handleViewportMouseDown" @wheel.prevent="handleWheel">
    <div class="canvas" ref="canvasRef" :style="canvasStyle">
      <div
        v-for="grid in modelValue"
        :key="grid.id || grid.segmentId"
        class="gridContainer"
        :class="{ dragging: dragState.draggingId === (grid.id || grid.segmentId), generating: isGenerating(grid.id) }"
        :data-id="grid.id || grid.segmentId"
        :style="{
          left: grid.x + 'px',
          top: grid.y + 'px',
          zIndex: grid.zIndex || 1,
        }">
        <div class="topMenu fc" @mousedown.stop="handleGridMouseDown($event, grid)">
          <div class="gridTitle" :title="grid.title">{{ grid.title }}</div>
          <div class="fragmentContent" :title="grid.fragmentContent">{{ grid.fragmentContent }}</div>
          <div class="f w" style="gap: 6px">
            <el-tag v-for="(sub, index) in grid.assetsTags" :key="index">{{ sub.text }}</el-tag>
          </div>
        </div>

        <a-spin :spinning="isGenerating(grid.id)" tip="生成中...">
          <div class="grid" :style="getGridStyle(grid.cells.length)">
            <div v-for="(cell, index) in grid.cells" :key="index" class="gridItem" :style="getImageSize">
              <div class="tag">镜头{{ index + 1 }}</div>
              <template v-if="cell.src">
                <img :src="cell.src" loading="lazy" @click="editImage(cell, grid.segmentId)" :style="getImageSize" />
                <div class="cellPrompt" :title="cell.prompt" @click.stop="updateCellPrompt($event, cell, grid.segmentId)">{{ cell.prompt }}</div>
                <i-preview-open
                  @click="
                    previewImage = cell.src;
                    previewPrompt = cell.prompt;
                    visible = true;
                  "
                  class="preview"
                  theme="outline"
                  size="24" />
              </template>
              <div v-else class="cellText" @click="updateCellPrompt($event, cell, grid.segmentId)" @keydown.enter.prevent="$event.target.blur()">
                {{ cell.prompt }}
              </div>
            </div>
          </div>
        </a-spin>
      </div>
    </div>
  </div>
  <storyboardEditor ref="editorRef" @save="saveImage" />
  <el-image-viewer
    v-if="visible"
    :url-list="[previewImage]"
    :initial-index="0"
    @close="setVisible(false)"
    :zoom-rate="1.2"
    :min-scale="0.1"
    :max-scale="10">
    <template v-if="previewPrompt" #progress>
      <div class="viewer-prompt">{{ previewPrompt }}</div>
    </template>
  </el-image-viewer>
</template>

<script setup>
import storyboardEditor from "@/components/storyboardEditor/index.vue";
import mainStore from "@/stores/index";
const editorRef = ref(null);
const { project } = storeToRefs(mainStore());
const props = defineProps({
  modelValue: { type: Array, required: true },
  generatingIds: { type: [Array, Set], default: () => [] },
});

const emit = defineEmits(["update:modelValue", "generateImage", "replaceShot"]);

// 检查分镜是否正在生成中（使用 Shot.id 匹配）
const isGenerating = (shotId) => {
  if (props.generatingIds instanceof Set) {
    return props.generatingIds.has(shotId);
  }
  return Array.isArray(props.generatingIds) && props.generatingIds.includes(shotId);
};

const clickOption = {
  segmentId: null,
  cellId: null,
};
function editImage(cell, segmentId) {
  clickOption.segmentId = segmentId;
  clickOption.cellId = cell.id;
  editorRef.value.doFusionEdit({
    id: -1,
    filePath: cell.src,
    otherImgs: [],
    prompt: cell.prompt,
    editPrompt: "@图1 进行细节优化",
    intro: "",
    scriptId: -1,
    generateImg: [],
  });
}

async function saveImage(data) {
  if (clickOption.segmentId && clickOption.cellId) {
    let cellData;
    const updatedValue = props.modelValue.map((item) => {
      if (item.segmentId === clickOption.segmentId) {
        const updatedCells = item.cells.map((cell) => {
          if (cell.id === clickOption.cellId) {
            cellData = { ...cell, src: data.filePath };
            return { ...cell, src: data.filePath };
          }
          return cell;
        });
        return { ...item, cells: updatedCells };
      }
      return item;
    });
    emit("update:modelValue", updatedValue);
    //todo 发送ws消息，告诉后台更新图片
    emit("replaceShot", {
      segmentId: clickOption.segmentId,
      cellId: clickOption.cellId,
      cell: cellData,
    });
    clickOption.cellId = null;
    clickOption.segmentId = null;
  }
}

const viewportRef = ref(null);
const canvasRef = ref(null);

const state = ref({
  x: 0,
  y: 0,
  scale: 1,
  isDragging: false,
  startX: 0,
  startY: 0,
  minScale: 0.2,
  maxScale: 5,
});

const dragState = ref({
  draggingId: null,
  startX: 0,
  startY: 0,
  gridStartX: 0,
  gridStartY: 0,
  isActive: false,
});

// 根据cells数量计算网格样式
const getGridStyle = (count) => {
  let cols, rows;

  if (count <= 2) {
    cols = count;
    rows = 1;
  } else if (count <= 4) {
    cols = 2;
    rows = Math.ceil(count / 2);
  } else {
    cols = 3;
    rows = Math.ceil(count / 3);
  }

  return {
    gridTemplateColumns: `repeat(${cols}, max-content)`,
    gridTemplateRows: `repeat(${rows}, max-content)`,
  };
};

// 根据视频比例计算图片尺寸
const getImageSize = computed(() => {
  const ratio = project.value?.videoRatio || "16:9";
  if (ratio === "9:16") {
    // 竖屏格式：宽度较小，高度较大
    return {
      maxWidth: "120px",
      maxHeight: "213px", // 约 120 * 16/9
      minWidth: "100px",
    };
  } else {
    // 横屏格式 16:9：宽度较大，高度较小
    return {
      maxWidth: "260px",
      maxHeight: "146px", // 约 260 * 9/16
      minWidth: "200px",
    };
  }
});

const viewportStyle = computed(() => {
  const size = 20 * state.value.scale;
  return {
    backgroundSize: `${size}px ${size}px`,
    backgroundPosition: `${state.value.x}px ${state.value.y}px`,
  };
});

const canvasStyle = computed(() => ({
  transform: `translate(${state.value.x}px, ${state.value.y}px) scale(${state.value.scale})`,
}));

const handleViewportMouseDown = (e) => {
  if (e.target === viewportRef.value || e.target === canvasRef.value) {
    state.value.isDragging = true;
    state.value.startX = e.clientX - state.value.x;
    state.value.startY = e.clientY - state.value.y;
  }
};

const handleGridMouseDown = (e, grid) => {
  // 只有当前实例处理拖拽，使用 id 或 segmentId 作为唯一标识符
  dragState.value.draggingId = grid.id || grid.segmentId;
  dragState.value.startX = e.clientX;
  dragState.value.startY = e.clientY;
  dragState.value.gridStartX = grid.x;
  dragState.value.gridStartY = grid.y;
  dragState.value.isActive = true;

  // 阻止事件冒泡，避免影响其他实例
  e.stopPropagation();
};

const handleWheel = (e) => {
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  const newScale = Math.max(state.value.minScale, Math.min(state.value.maxScale, state.value.scale + delta));
  if (newScale === state.value.scale) return;

  const rect = viewportRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const ratio = newScale / state.value.scale;

  state.value.x = mouseX - (mouseX - state.value.x) * ratio;
  state.value.y = mouseY - (mouseY - state.value.y) * ratio;
  state.value.scale = newScale;
};

const focusOnGrid = (gridId, duration = 300) => {
  // 支持使用 id 或 segmentId 查找
  const gridData = props.modelValue.find((item) => (item.id || item.segmentId) === gridId);
  const gridElement = canvasRef.value?.querySelector(`[data-id="${gridId}"]`);
  if (!gridData || !gridElement || !viewportRef.value) return;

  const viewportRect = viewportRef.value.getBoundingClientRect();
  const targetX = viewportRect.width / 2 - (gridData.x + gridElement.offsetWidth / 2) * state.value.scale;
  const targetY = viewportRect.height / 2 - (gridData.y + gridElement.offsetHeight / 2) * state.value.scale;

  const startX = state.value.x;
  const startY = state.value.y;
  const startTime = performance.now();

  const animate = (currentTime) => {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    state.value.x = startX + (targetX - startX) * ease;
    state.value.y = startY + (targetY - startY) * ease;

    if (progress < 1) requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
};

defineExpose({ focusOnGrid });

// 存储实例专用的事件处理器引用
let instanceMouseMove = null;
let instanceMouseUp = null;

// z-index 计数器，用于管理层级
let zIndexCounter = 10;

onMounted(() => {
  // 为每个实例创建独立的事件处理器，使用闭包保证实例隔离
  instanceMouseMove = (e) => {
    // 只处理当前实例的拖拽状态
    if (dragState.value.draggingId !== null && dragState.value.isActive) {
      e.stopPropagation();

      const deltaX = (e.clientX - dragState.value.startX) / state.value.scale;
      const deltaY = (e.clientY - dragState.value.startY) / state.value.scale;

      const updatedValue = props.modelValue.map((item) =>
        (item.id || item.segmentId) === dragState.value.draggingId
          ? { ...item, x: dragState.value.gridStartX + deltaX, y: dragState.value.gridStartY + deltaY }
          : item,
      );

      emit("update:modelValue", updatedValue);
      return;
    }

    if (state.value.isDragging) {
      state.value.x = e.clientX - state.value.startX;
      state.value.y = e.clientY - state.value.startY;
    }
  };

  instanceMouseUp = () => {
    if (dragState.value.isActive || state.value.isDragging) {
      // 如果正在拖拽网格，更新其z-index
      if (dragState.value.draggingId !== null && dragState.value.isActive) {
        zIndexCounter++; // 递增计数器
        const updatedValue = props.modelValue.map((item) => {
          if ((item.id || item.segmentId) === dragState.value.draggingId) {
            // 拖拽结束后，设置较高的z-index以保持在前面
            return { ...item, zIndex: zIndexCounter };
          }
          return item;
        });
        emit("update:modelValue", updatedValue);
      }

      state.value.isDragging = false;
      dragState.value.draggingId = null;
      dragState.value.isActive = false;
    }
  };

  document.addEventListener("mousemove", instanceMouseMove);
  document.addEventListener("mouseup", instanceMouseUp);
});

onUnmounted(() => {
  // 清理当前实例的事件监听器
  if (instanceMouseMove) {
    document.removeEventListener("mousemove", instanceMouseMove);
  }
  if (instanceMouseUp) {
    document.removeEventListener("mouseup", instanceMouseUp);
  }
});

function generatingImage(grid) {
  emit("generateImage", grid);
}

function updateCellPrompt(event, cell, segmentId) {
  ElMessageBox.prompt("请输入镜头提示词", "提示词", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    inputValue: cell.prompt,
    inputType: "textarea",
  }).then(({ value }) => {
    if (value !== cell.prompt) {
      let updatedCell;
      const updatedValue = props.modelValue.map((item) => {
        if (item.segmentId === segmentId) {
          const updatedCells = item.cells.map((c) => {
            if (c.id === cell.id) {
              updatedCell = { ...c, prompt: value };
              return updatedCell;
            }
            return c;
          });
          return { ...item, cells: updatedCells };
        }
        return item;
      });

      emit("update:modelValue", updatedValue);
      emit("replaceShot", {
        segmentId: segmentId,
        cellId: cell.id,
        cell: updatedCell,
      });
    }
  });
}
const previewImage = ref("");
const previewPrompt = ref("");
const visible = ref(false);

const setVisible = (value) => {
  visible.value = value;
  if (!value) {
    previewPrompt.value = "";
  }
};
</script>

<style lang="scss" scoped>
$primaryColor: #1890ff;
$bgColor: #e8e8e8;
$gridLineColor: #d0d0d0;
$shadowMedium: rgba(0, 0, 0, 0.15);
$shadowDark: rgba(0, 0, 0, 0.3);
$promptBg: rgba(0, 0, 0, 0.6);
$hoverBg: #e8f4ff;

.viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  position: relative;
  background-color: $bgColor;
  background-image: linear-gradient($gridLineColor 1px, transparent 1px), linear-gradient(90deg, $gridLineColor 1px, transparent 1px);

  &:active {
    cursor: grabbing;
  }
}

.canvas {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
}

.gridContainer {
  position: absolute;
  padding: 10px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
  user-select: none;
  transition: box-shadow 0.3s;

  &:hover {
    box-shadow: 0 8px 24px $shadowMedium;
  }

  &.dragging {
    box-shadow: 0 12px 32px $shadowDark;
    z-index: 999 !important; // 拖拽时使用高优先级
    opacity: 0.9;
  }

  &.generating {
    .grid {
      opacity: 0.6;
    }
  }
  .topMenu {
    margin-bottom: 8px;
    cursor: move;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.2s;
    width: 100%;
    min-width: 0;
    .gridTitle {
      font-size: 14px;
      margin-bottom: 8px;
      font-weight: 500;
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-right: 8px;
    }
    .fragmentContent {
      display: -webkit-box;
      -webkit-line-clamp: 2; /* 限制为2行 */
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btnList {
      & > * {
        margin-left: 5px;
      }
    }
  }
}

.grid {
  display: grid;
  gap: 2px;
  border: 2px solid #ccc;
  background: #ccc;
  border-radius: 4px;
  overflow: hidden;
}

.gridItem {
  background: #fff;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    z-index: 10;
    // box-shadow: 0 4px 12px $shadowDark;

    img {
      filter: brightness(1.05);
    }

    .cellText {
      color: $primaryColor;
    }

    .cellPrompt {
      transform: translateY(0);
    }
    .preview {
      display: block;
    }
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    transition: filter 0.2s;
  }
  .tag {
    z-index: 10;
    position: absolute;
    top: 4px;
    left: 4px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    backdrop-filter: blur(4px);
    font-size: 12px;
    padding: 2px;
    border-radius: 4px;
  }
}

.cellText {
  width: 100%;
  height: 100%;
  max-width: 260px;
  font-size: 12px;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  align-items: center;
  justify-content: center;
  padding: 8px;
  text-align: center;
  outline: none;
}

.cellPrompt {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: $promptBg;
  color: #fff;
  font-size: 10px;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: transform 0.2s;
  cursor: pointer;
  pointer-events: auto;
}
.preview {
  position: absolute;
  top: 5px;
  right: 5px;
  display: none;
  color: #fff;
}
</style>

<style lang="scss">
.viewer-prompt {
  color: #ffffff !important;
  background: rgba(0, 0, 0, 0.3);
  padding: 5px;
  border-radius: 5px;
}
</style>
