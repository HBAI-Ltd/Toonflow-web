<template>
  <div class="previewContainer">
    <div class="mainContent">
      <!-- 左侧预览区域 -->
      <div class="previewArea">
        <div class="videoWrapper">
          <img v-if="currentShot?.filePath" :src="currentShot.filePath" :alt="currentShot.description" class="previewImage" />
          <div v-else class="placeholderImage">
            <i-pic theme="outline" size="48" fill="#999" />
            <span>{{ $t("workbench.production.preview.noImage") }}</span>
          </div>
        </div>

        <div class="playerControls">
          <div class="controlButtons">
            <t-button theme="default" variant="text" size="small" shape="circle" @click="prevShot" :disabled="isFirstShot">
              <template #icon><i-go-start theme="outline" size="18" /></template>
            </t-button>
            <t-button theme="primary" variant="text" size="medium" shape="circle" @click="togglePlay">
              <template #icon>
                <component :is="isPlaying ? 'i-pause' : 'i-play'" theme="outline" size="22" />
              </template>
            </t-button>
            <t-button theme="default" variant="text" size="small" shape="circle" @click="nextShot" :disabled="isLastShot">
              <template #icon><i-go-end theme="outline" size="18" /></template>
            </t-button>
          </div>
          <div class="progressArea">
            <span class="timeLabel">{{ formatTime(currentElapsed) }}</span>
            <div class="progressBarWrapper" ref="progressBarRef" @mousedown="onProgressMouseDown">
              <div class="progressTrack">
                <div
                  v-for="(shot, index) in shotList"
                  :key="'seg-' + shot.id"
                  class="progressSegment"
                  :class="{ active: index === currentShotIndex, completed: index < currentShotIndex }"
                  :style="{ width: getSegmentWidth(index) + '%', left: getSegmentLeft(index) + '%' }"
                  @click.stop="jumpToShot(index)" />
                <div
                  v-for="(_, index) in shotList.slice(0, -1)"
                  :key="'div-' + index"
                  class="segmentDivider"
                  :style="{ left: getSegmentLeft(index + 1) + '%' }" />
                <div class="progressFill" :style="{ width: totalProgress + '%' }" />
                <div class="progressHandle" :style="{ left: totalProgress + '%' }" />
              </div>
            </div>
            <span class="timeLabel">{{ formatTime(totalDuration) }}</span>
          </div>
        </div>
      </div>

      <div class="infoPanel">
        <div class="infoSection">
          <div class="sectionTitle">
            <span class="titleIndicator" />
            {{ $t("workbench.production.preview.storyboardDesc") }}
          </div>
          <div class="sectionContent">
            【{{ $t("workbench.production.preview.serialNumber") }} {{ currentShotIndex + 1 }}】{{
              currentShot?.description || $t("workbench.production.preview.noDescription")
            }}
          </div>
        </div>

        <div class="infoSection">
          <div class="sectionTitle">
            <span class="titleIndicator" />
            {{ $t("workbench.production.preview.duration") }}
          </div>
          <div class="sectionContent">
            {{
              currentShot?.duration != null
                ? currentShot.duration + " " + $t("workbench.production.preview.seconds")
                : "3 " + $t("workbench.production.preview.seconds")
            }}
          </div>
        </div>

        <div class="infoSection">
          <div class="sectionTitle">
            <span class="titleIndicator" />
            {{ $t("workbench.production.preview.relatedAssets") }}
          </div>
          <div class="characterList">
            <div v-for="(char, index) in currentCharacters" :key="index" class="characterItem">
              <t-image :src="char.avatar" fit="cover" class="characterAvatar" :style="{ width: '80px', height: '80px', borderRadius: '8px' }" />
              <t-tag>
                {{ char.name }}（{{
                  char.type == "role"
                    ? $t("workbench.production.preview.role")
                    : char.type == "tool"
                      ? $t("workbench.production.preview.prop")
                      : $t("workbench.production.preview.scene")
                }}）
              </t-tag>
            </div>
            <div v-if="!currentCharacters.length" class="noCharacter">
              <t-tag theme="default" variant="light">{{ $t("workbench.production.preview.noCharacters") }}</t-tag>
            </div>
          </div>
        </div>
        <div class="infoSection">
          <div class="sectionTitle">
            <span class="titleIndicator" />
            {{ $t("workbench.production.preview.imagePrompt") }}
          </div>
          <div class="shootingTips">
            <template v-for="item in promptTips" :key="item.label">
              <div v-if="item.value" class="tipItem">
                <span class="tipLabel">{{ item.label }}：</span>
                <span class="tipValue">{{ item.value }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="shotListArea">
      <div class="shotListHeader">
        <div class="headerLeft">
          <t-checkbox v-model="selectAll" @change="handleSelectAll">{{ $t("workbench.production.preview.selectAll") }}</t-checkbox>
          <t-button theme="default" variant="text" size="small" @click="confirmRestoreSort">
            <template #icon><i-undo theme="outline" size="16" /></template>
            {{ $t("workbench.production.preview.restoreSort") }}
          </t-button>
        </div>
        <t-button theme="default" variant="text" size="small" class="exportBtn" @click="exportImage">
          <template #icon><i-download theme="outline" size="16" /></template>
          {{ $t("workbench.production.preview.exportImage") }}
        </t-button>
      </div>
      <div class="shotListWrapper" ref="shotListWrapperRef">
        <VueDraggable
          v-model="shotList"
          :animation="150"
          ghostClass="shotGhost"
          dragClass="shotDrag"
          :scroll="shotListWrapperRef"
          :scrollSensitivity="80"
          :scrollSpeed="10"
          :forceFallback="true"
          target=".shotList"
          @start="isDragging = true"
          @end="onDragEnd">
          <TransitionGroup type="transition" tag="div" :name="!isDragging ? 'shot-flip' : undefined" class="shotList">
            <div
              v-for="(shot, index) in shotList"
              :key="shot.id"
              class="shotItem"
              :class="{ active: currentShotIndex === index }"
              @click="selectShot(index)">
              <t-checkbox v-model="shot.selected" class="shotCheckbox" @click.stop />
              <div class="shotImageWrapper">
                <img v-if="shot.filePath" :src="shot.filePath" :alt="shot.description" class="shotImage" />
                <div v-else class="shotPlaceholder">
                  <i-pic theme="outline" size="24" fill="#999" />
                </div>
                <t-tag class="shotNumber" size="small" variant="dark">#{{ shot.id }}</t-tag>
              </div>
            </div>
          </TransitionGroup>
        </VueDraggable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, type Ref } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { DialogPlugin } from "tdesign-vue-next";
import axios from "@/utils/axios";

interface ShotCharacter {
  name: string;
  type: string;
  avatar?: string;
}

interface Shot {
  id: string;
  camera?: number;
  createTime?: number;
  description?: string;
  duration?: number;
  filePath?: string;
  frameMode?: number;
  mode: string;
  model: string;
  prompt?: string;
  resolution?: string;
  scriptId?: number;
  sound?: number;
  title?: string;
  selected?: boolean;
  characters?: ShotCharacter[];
}
const episodesId = inject<Ref<number>>("episodesId");

// 模拟分镜数据
const shotList = ref<Shot[]>([]);
onMounted(() => {
  getShotList();
});
//查询分镜数据
async function getShotList() {
  const { data } = await axios.post("/production/getStoryboardData", {
    scriptId: episodesId!.value,
  });
  shotList.value = data;
}
const currentShot = computed(() => shotList.value[currentShotIndex.value] || null);
const currentCharacters = computed(() => currentShot.value?.characters || []);
const currentShotIndex = ref(0);
const selectAll = ref(false);
const shotListWrapperRef = ref<HTMLElement>();
const progressBarRef = ref<HTMLElement>();
const isDragging = ref(false);

// 播放状态
const isPlaying = ref(false);
const currentElapsed = ref(0);
let playTimer: ReturnType<typeof setInterval> | null = null;
const TICK_INTERVAL = 50;

const initialOrder = shotList.value.map((shot) => shot.id);

// ===== 计算属性 =====

const currentShotDuration = computed(() => currentShot.value?.duration ?? 3);
const isFirstShot = computed(() => currentShotIndex.value === 0);
const isLastShot = computed(() => currentShotIndex.value === shotList.value.length - 1);

const totalDuration = computed(() => shotList.value.reduce((sum, s) => sum + (s.duration ?? 3), 0));

const totalProgress = computed(() => {
  const elapsed = getCumulativeDuration(currentShotIndex.value) + currentElapsed.value;
  return Math.min((elapsed / totalDuration.value) * 100, 100);
});

const promptTips = computed(() => [
  { label: $t("workbench.production.preview.sceneDescription"), value: currentShot.value?.description },
  // { label: "运镜方式", value: currentShot.value?.camera != null ? String(currentShot.value.camera) : undefined },
  { label: $t("workbench.production.preview.promptLabel"), value: currentShot.value?.prompt },
]);

// ===== 工具函数 =====

const getDuration = (index: number) => shotList.value[index]?.duration ?? 3;

const getCumulativeDuration = (index: number) => {
  let sum = 0;
  for (let i = 0; i < index; i++) sum += getDuration(i);
  return sum;
};

const getSegmentWidth = (index: number) => (getDuration(index) / totalDuration.value) * 100;
const getSegmentLeft = (index: number) => (getCumulativeDuration(index) / totalDuration.value) * 100;

const formatTime = (seconds: number) => {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

// ===== 播放控制 =====

const stopPlay = () => {
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
  isPlaying.value = false;
};

const startPlay = () => {
  if (playTimer) return;
  isPlaying.value = true;
  playTimer = setInterval(() => {
    currentElapsed.value += TICK_INTERVAL / 1000;
    if (currentElapsed.value >= currentShotDuration.value) {
      if (!isLastShot.value) {
        currentElapsed.value = 0;
        currentShotIndex.value++;
        scrollToCurrentShot();
      } else {
        currentElapsed.value = currentShotDuration.value;
        stopPlay();
      }
    }
  }, TICK_INTERVAL);
};

const togglePlay = () => {
  if (isPlaying.value) return stopPlay();
  if (isLastShot.value && currentElapsed.value >= currentShotDuration.value) {
    currentShotIndex.value = 0;
    currentElapsed.value = 0;
  }
  startPlay();
};

onUnmounted(stopPlay);

// ===== 导航 =====

const goToShot = (index: number, shouldStopPlay = true) => {
  if (shouldStopPlay) stopPlay();
  currentShotIndex.value = index;
  currentElapsed.value = 0;
  scrollToCurrentShot();
};

const prevShot = () => {
  if (!isFirstShot.value) goToShot(currentShotIndex.value - 1);
};
const nextShot = () => {
  if (!isLastShot.value) goToShot(currentShotIndex.value + 1);
};
const jumpToShot = (index: number) => goToShot(index);
const selectShot = (index: number) => goToShot(index);

// ===== 进度条拖拽 =====

const onProgressMouseDown = (e: MouseEvent) => {
  const bar = progressBarRef.value;
  if (!bar) return;
  stopPlay();

  const seekTo = (event: MouseEvent) => {
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const targetTime = ratio * totalDuration.value;

    let cumulative = 0;
    for (let i = 0; i < shotList.value.length; i++) {
      const dur = getDuration(i);
      if (cumulative + dur > targetTime) {
        currentShotIndex.value = i;
        currentElapsed.value = targetTime - cumulative;
        scrollToCurrentShot();
        return;
      }
      cumulative += dur;
    }
    currentShotIndex.value = shotList.value.length - 1;
    currentElapsed.value = getDuration(shotList.value.length - 1);
  };

  seekTo(e);

  const onMouseUp = () => {
    document.removeEventListener("mousemove", seekTo);
    document.removeEventListener("mouseup", onMouseUp);
  };
  document.addEventListener("mousemove", seekTo);
  document.addEventListener("mouseup", onMouseUp);
};

// ===== 列表操作 =====

const scrollToCurrentShot = () => {
  nextTick(() => {
    const items = shotListWrapperRef.value?.querySelectorAll(".shotItem");
    (items?.[currentShotIndex.value] as HTMLElement)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  });
};

const handleSelectAll = (checked: boolean | string[]) => {
  const isChecked = Array.isArray(checked) ? checked.length > 0 : checked;
  shotList.value.forEach((shot) => (shot.selected = isChecked));
};

const confirmRestoreSort = () => {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.production.preview.restoreSort"),
    body: $t("workbench.production.preview.restoreSortConfirm"),
    onConfirm: () => {
      shotList.value.sort((a, b) => initialOrder.indexOf(a.id) - initialOrder.indexOf(b.id));
      dialog.destroy();
    },
    onClose: () => dialog.destroy(),
  });
};

watch(
  () => shotList.value.map((s) => s.selected),
  (selections) => {
    selectAll.value = selections.length > 0 && selections.every(Boolean);
  },
  { deep: true },
);

const onDragEnd = () => nextTick(() => (isDragging.value = false));

function exportImage() {
  //拿到选中的数据
  const selectedShots = shotList.value.filter((shot) => shot.selected).map((shot) => ({ id: shot.id }));
  if (selectedShots.length <= 0) {
    DialogPlugin.alert({
      header: $t("workbench.production.preview.tip"),
      body: $t("workbench.production.preview.selectAtLeastOne"),
    });
    return;
  }
  axios
    .post("/production/exportImage", {
      shotId: selectedShots,
    })
    .then((response) => {
      const { data } = response;
      const link = document.createElement("a");
      link.href = data.url;
      link.download = $t("workbench.production.preview.exportFilename");
      link.click();
    })
    .catch((error) => {
      console.error("导出图片失败:", error);
    });
}
</script>

<style lang="scss" scoped>
%flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.previewContainer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  gap: 16px;

  .mainContent {
    display: flex;
    flex: 1;
    gap: 24px;
    min-height: 0;

    .previewArea {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e8e8e8;

      .videoWrapper {
        width: 100%;
        flex: 1;
        @extend %flex-center;
        min-height: 0;

        .previewImage {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .placeholderImage {
          @extend %flex-center;
          flex-direction: column;
          gap: 12px;
          color: #999;
          font-size: 14px;
        }
      }

      .playerControls {
        width: 100%;
        flex-shrink: 0;
        padding: 10px 16px 12px;
        background: rgba(255, 255, 255, 0.95);
        border-top: 1px solid #e8e8e8;

        .controlButtons {
          @extend %flex-center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .progressArea {
          display: flex;
          align-items: center;
          gap: 10px;

          .timeLabel {
            font-size: 12px;
            color: #999;
            font-variant-numeric: tabular-nums;
            min-width: 40px;
            text-align: center;
            user-select: none;
          }

          .progressBarWrapper {
            flex: 1;
            height: 20px;
            display: flex;
            align-items: center;
            cursor: pointer;

            .progressTrack {
              width: 100%;
              height: 6px;
              background: #e8e8e8;
              border-radius: 3px;
              position: relative;

              .progressSegment {
                position: absolute;
                top: 0;
                height: 100%;
                border-radius: 3px;
                transition: background 0.2s;
                z-index: 1;
                &.completed {
                  background: rgba(102, 126, 234, 0.15);
                }
                &.active {
                  background: var(--td-brand-color-10-5) !important;
                }
                &:hover {
                  background: var(--td-brand-color-10-3);
                }
              }

              .segmentDivider {
                position: absolute;
                top: -2px;
                width: 1.5px;
                height: calc(100% + 4px);
                background: #ccc;
                z-index: 3;
                transform: translateX(-50%);
                pointer-events: none;
              }

              .progressFill {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                background: var(--td-brand-color-10);
                border-radius: 3px;
                z-index: 2;
                transition: width 0.05s linear;
                pointer-events: none;
              }

              .progressHandle {
                position: absolute;
                top: 50%;
                width: 14px;
                height: 14px;
                background: #fff;
                border: 2px solid var(--td-brand-color-10-10);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                z-index: 4;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
                transition:
                  left 0.05s linear,
                  transform 0.15s;
                pointer-events: none;
                &:hover {
                  transform: translate(-50%, -50%) scale(1.2);
                }
              }
            }
          }
        }
      }
    }

    .infoPanel {
      width: 380px;
      flex-shrink: 0;
      overflow-y: auto;
      padding-right: 8px;

      &::-webkit-scrollbar {
        width: 4px;
      }
      &::-webkit-scrollbar-thumb {
        background: #ddd;
        border-radius: 2px;
      }

      .infoSection {
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid #f0f0f0;
        &:last-child {
          border-bottom: none;
        }

        .sectionTitle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;

          .titleIndicator {
            width: 3px;
            height: 14px;
            background: var(--td-brand-color-10);
            border-radius: 2px;
          }
        }

        .sectionContent {
          font-size: 14px;
          color: #666;
          line-height: 1.6;
        }

        .characterList {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;

          .characterItem {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;

            .characterAvatar {
              border: 2px solid #e8e8e8;
            }
          }

          .noCharacter {
            padding: 8px 0;
          }
        }

        .characterDesc {
          margin-top: 12px;
          font-size: 13px;
          color: #999;
          line-height: 1.5;
        }

        .shootingTips {
          display: flex;
          flex-direction: column;
          gap: 8px;

          .tipItem {
            font-size: 13px;
            color: #666;
            line-height: 1.6;
            .tipLabel {
              color: #333;
              font-weight: 500;
            }
          }
        }
      }
    }
  }

  .shotListArea {
    flex-shrink: 0;
    border-top: 1px solid #e8e8e8;
    padding-top: 12px;

    .shotListHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding: 0 4px;

      .headerLeft {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .exportBtn {
        color: var(--td-brand-color-10-10);
      }
    }

    .shotListWrapper {
      overflow-x: auto;
      &::-webkit-scrollbar {
        height: 6px;
      }
      &::-webkit-scrollbar-thumb {
        background: #ddd;
        border-radius: 3px;
      }

      .shotList {
        display: flex;

        .shotItem {
          flex-shrink: 0;
          width: 160px;
          margin-right: 12px;
          cursor: pointer;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid transparent;
          background: #fff;
          position: relative;

          &:hover,
          &.active {
            border-color: var(--td-brand-color-10-10);
          }

          .shotCheckbox {
            position: absolute;
            top: 8px;
            left: 8px;
            z-index: 2;
          }

          .shotImageWrapper {
            position: relative;
            width: 100%;
            height: 100px;
            background: #f5f5f5;

            .shotImage {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .shotPlaceholder {
              width: 100%;
              height: 100%;
              @extend %flex-center;
            }

            .shotNumber {
              position: absolute;
              bottom: 6px;
              right: 6px;
            }
          }
        }
      }
    }
  }
}
</style>

<!-- Sortable.js 动态添加的 class 不受 scoped 影响，需要全局样式 -->
<style lang="scss">
.shotGhost {
  opacity: 0.5;
  background: #c8ebfb;
  border: 2px dashed var(--td-brand-color-10-10) !important;
}

.shotDrag {
  opacity: 0.9;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transform: scale(1.02);
}

.shot-flip-move {
  transition: transform 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}
</style>
