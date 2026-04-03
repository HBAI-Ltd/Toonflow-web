<template>
  <div class="mediaLibrary">
    <div class="mediaLibraryHeader">
      <div class="headerTitle">
        <h3 class="mediaLibraryTitle">{{ $t("workbench.production.editVideo.clipMaterials") }}</h3>
      </div>
      <div class="mediaLibraryTabs">
        <t-button
          v-for="tab in tabs"
          :key="tab.id"
          :theme="activeTab === tab.id ? 'primary' : 'default'"
          :variant="activeTab === tab.id ? 'base' : 'text'"
          size="small"
          @click="activeTab = tab.id">
          <template #icon>
            <component :is="tab.icon" theme="outline" size="18" style="margin-right: 4px" />
          </template>
          {{ tab.label }}
        </t-button>
      </div>
    </div>

    <div class="mediaLibraryContent">
      <!-- 分镜视频 -->
      <div v-if="activeTab === 'video'" class="mediaList">
        <div
          v-for="item in videoItems"
          :key="item.id"
          class="mediaItem"
          draggable="true"
          @dragstart="handleDragStart($event, item)"
          @dragend="handleDragEnd">
          <div class="mediaItemPreview">
            <t-image v-if="item.thumbnail" :src="item.thumbnail" fit="cover" class="mediaItemThumbnail" />
            <component v-else :is="item.icon" theme="outline" size="18" />
            <div v-if="item.loading" class="mediaItemLoading">
              <t-loading size="small" />
            </div>
          </div>
          <div class="mediaItemInfo">
            <div class="selected" v-if="item.selected">
              <i-check-one theme="filled" size="16" fill="#000000" />
            </div>
            <div class="mediaItemName">
              <t-popup :content="item.name">
                {{ item.name }}
              </t-popup>
            </div>
            <t-tag v-if="item.duration" size="small" theme="default" variant="light">{{ formatDuration(item.duration) }}</t-tag>
          </div>
        </div>
      </div>
      <!-- 媒体素材 -->
      <div v-if="activeTab === 'media'" class="mediaList">
        <div
          v-for="item in mediaItems"
          :key="item.id"
          class="mediaItem"
          draggable="true"
          @dragstart="handleDragStart($event, item)"
          @dragend="handleDragEnd">
          <div class="mediaItemPreview">
            <t-image v-if="item.thumbnail" :src="item.thumbnail" fit="cover" class="mediaItemThumbnail" />
            <component v-else :is="item.icon" theme="outline" size="18" />
            <div v-if="item.loading" class="mediaItemLoading">
              <t-loading size="small" />
            </div>
          </div>
          <div class="mediaItemInfo">
            <div class="mediaItemName">
              <t-popup :content="item.name">
                {{ item.name }}
              </t-popup>
            </div>
            <t-tag v-if="item.duration" size="small" theme="default" variant="light">{{ formatDuration(item.duration) }}</t-tag>
          </div>
        </div>
      </div>

      <!-- 图片素材 -->
      <div v-if="activeTab === 'image'" class="mediaList">
        <div
          v-for="item in imageItems"
          :key="item.id"
          class="mediaItem"
          draggable="true"
          @dragstart="handleDragStart($event, item)"
          @dragend="handleDragEnd">
          <div class="mediaItemPreview">
            <t-image v-if="item.thumbnail" :src="item.thumbnail" fit="cover" class="mediaItemThumbnail" />
            <component v-else :is="item.icon" theme="outline" size="18" />
            <div v-if="item.loading" class="mediaItemLoading">
              <t-loading size="small" />
            </div>
          </div>
          <div class="mediaItemInfo">
            <div class="mediaItemName">
              <t-popup :content="item.name">
                {{ item.name }}
              </t-popup>
            </div>
          </div>
        </div>
      </div>

      <!-- 转场效果 -->
      <div v-if="activeTab === 'transition'" class="transitionList">
        <div
          v-for="transition in transitionItems"
          :key="transition.id"
          class="transitionItem"
          draggable="true"
          @dragstart="handleDragStart($event, transition)"
          @dragend="handleDragEnd">
          <div class="transitionItemPreview">
            <span class="transitionItemIcon"><component :is="transition.icon" theme="outline" size="18" /></span>
          </div>
          <div class="transitionItemName">
            <t-popup :content="transition.name">
              {{ transition.name }}
            </t-popup>
          </div>
        </div>
      </div>

      <!-- 特效 -->
      <div v-if="activeTab === 'effect'" class="effectList">
        <div
          v-for="effect in effectItems"
          :key="effect.id"
          class="effectItem"
          draggable="true"
          @dragstart="handleDragStart($event, effect)"
          @dragend="handleDragEnd">
          <div class="effectItemPreview">
            <component :is="effect.icon" theme="outline" size="18" />
          </div>
          <div class="effectItemName">
            <t-popup :content="effect.name">
              {{ effect.name }}
            </t-popup>
          </div>
        </div>
      </div>

      <!-- 滤镜 -->
      <div v-if="activeTab === 'filter'" class="filterList">
        <div
          v-for="filter in filterItems"
          :key="filter.id"
          class="filterItem"
          draggable="true"
          @dragstart="handleDragStart($event, filter)"
          @dragend="handleDragEnd">
          <div class="filterItemPreview">
            <component :is="filter.icon" theme="outline" size="18" />
          </div>
          <div class="filterItemName">
            <t-popup :content="filter.name">
              {{ filter.name }}
            </t-popup>
          </div>
        </div>
      </div>

      <!-- 音频 -->
      <div v-if="activeTab === 'audio'" class="audioList">
        <div
          v-for="audio in audioItems"
          :key="audio.id"
          class="audioItem"
          draggable="true"
          @dragstart="handleDragStart($event, audio)"
          @dragend="handleDragEnd">
          <div class="audioItemPreview">
            <i-music theme="outline" size="18" />
            <div v-if="audio.loading" class="mediaItemLoading">
              <t-loading size="small" />
            </div>
          </div>
          <div class="audioItemInfo">
            <div class="audioItemName">
              <t-popup :content="audio.name">
                {{ audio.name }}
              </t-popup>
            </div>
            <t-tag v-if="audio.duration" size="small" theme="default" variant="light">{{ formatDuration(audio.duration) }}</t-tag>
          </div>
        </div>
      </div>

      <!-- 字幕/文本 -->
      <div v-if="activeTab === 'text'" class="textList">
        <div
          v-for="text in textItems"
          :key="text.id"
          class="textItem"
          draggable="true"
          @dragstart="handleDragStart($event, text)"
          @dragend="handleDragEnd">
          <div class="textItemPreview">
            <span class="textItemContent">{{ text.preview }}</span>
          </div>
          <div class="textItemName">
            <t-popup :content="text.name">
              {{ text.name }}
            </t-popup>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { extractVideoThumbnails, extractAudioWaveform } from "vue-clip-track";
import {
  type MediaItem,
  type AudioItem,
  getTextItems,
  getTransitionItems,
  getEffectItems,
  getFilterItems,
  getLibraryTabs,
  formatDuration,
} from "./utils/mediaData";

const props = withDefaults(
  defineProps<{
    initialVideoItems?: MediaItem[];
    initialMediaItems?: MediaItem[];
    initialAudioItems?: AudioItem[];
    initialImageItems?: MediaItem[];
  }>(),
  {
    initialVideoItems: () => [],
    initialMediaItems: () => [],
    initialAudioItems: () => [],
    initialImageItems: () => [],
  },
);

const activeTab = ref("video");

const tabs = getLibraryTabs();

const videoItems = ref<MediaItem[]>([...props.initialVideoItems]);
const mediaItems = ref<MediaItem[]>([...props.initialMediaItems]);
const audioItems = ref<AudioItem[]>([...props.initialAudioItems]);
const imageItems = ref<MediaItem[]>([...props.initialImageItems]);
const textItems = ref(getTextItems());

// 监听 props 变化，同步更新本地数据并加载缩略图/波形
watch(
  () => props.initialVideoItems,
  (newItems) => {
    videoItems.value = [...newItems];
    if (newItems.length > 0) {
      loadVideoThumbnails();
    }
  },
);

watch(
  () => props.initialMediaItems,
  (newItems) => {
    mediaItems.value = [...newItems];
    if (newItems.length > 0) {
      loadVideoThumbnails();
    }
  },
);

watch(
  () => props.initialAudioItems,
  (newItems) => {
    audioItems.value = [...newItems];
    if (newItems.length > 0) {
      loadAudioWaveforms();
    }
  },
);

watch(
  () => props.initialImageItems,
  (newItems) => {
    imageItems.value = [...newItems];
    if (newItems.length > 0) {
      loadImageThumbnails();
    }
  },
);
const transitionItems = ref(getTransitionItems());
const effectItems = ref(getEffectItems());
const filterItems = ref(getFilterItems());

// 加载视频缩略图和时长
async function loadVideoThumbnails() {
  for (const item of mediaItems.value) {
    try {
      const result = await extractVideoThumbnails(item.url, { count: 10, width: 120 });
      item.duration = result.duration;
      item.thumbnails = result.thumbnails;
      item.thumbnail = result.thumbnails[0] || "";
      item.loading = false;
    } catch (error) {
      console.error(`Failed to load thumbnails for ${item.name}:`, error);
      item.loading = false;
      item.duration = 5; // 默认时长
    }
  }
  for (const item of videoItems.value) {
    try {
      const result = await extractVideoThumbnails(item.url, { count: 10, width: 120 });
      item.duration = result.duration;
      item.thumbnails = result.thumbnails;
      item.thumbnail = result.thumbnails[0] || "";
      item.loading = false;
    } catch (error) {
      console.error(`Failed to load thumbnails for ${item.name}:`, error);
      item.loading = false;
      item.duration = 5; // 默认时长
    }
  }
}

// 加载图片缩略图
async function loadImageThumbnails() {
  for (const item of imageItems.value) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          item.thumbnail = item.url;
          item.loading = false;
          resolve();
        };
        img.onerror = reject;
        img.src = item.url;
      });
    } catch (error) {
      console.error(`Failed to load image ${item.name}:`, error);
      item.loading = false;
    }
  }
}

// 加载音频波形数据
async function loadAudioWaveforms() {
  for (const item of audioItems.value) {
    try {
      const result = await extractAudioWaveform(item.url, { samples: 50 });
      item.duration = result.duration;
      item.waveformData = result.waveformData;
      item.loading = false;
    } catch (error) {
      console.error(`Failed to load waveform for ${item.name}:`, error);
      item.loading = false;
      item.duration = 30; // 默认时长
    }
  }
}

function handleDragStart(event: DragEvent, item: any) {
  if (!event.dataTransfer) return;

  // 设置拖拽数据，包含完整的媒体信息
  const dragData = {
    ...item,
    sourceUrl: item.url || item.id,
  };
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/json", JSON.stringify(dragData));
  event.dataTransfer.setData("text/plain", item.name);

  // 添加拖拽样式
  if (event.target instanceof HTMLElement) {
    event.target.classList.add("dragging");
  }
}

function handleDragEnd(event: DragEvent) {
  if (event.target instanceof HTMLElement) {
    event.target.classList.remove("dragging");
  }
}

// 组件挂载时加载媒体数据
onMounted(() => {
  // 延迟加载，避免阻塞 UI
  setTimeout(() => {
    loadVideoThumbnails();
    loadAudioWaveforms();
    loadImageThumbnails();
  }, 100);
});
</script>

<style lang="scss" scoped>
%flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mediaLibrary {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;

  .mediaLibraryHeader {
    flex-shrink: 0;
    padding: 16px 12px 12px;
    border-bottom: 1px solid #e8e8e8;
    background: #fff;

    .headerTitle {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;

      .mediaLibraryTitle {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #333;
        letter-spacing: -0.01em;
      }
    }

    .mediaLibraryTabs {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
  }

  .mediaLibraryContent {
    flex: 1;
    overflow-y: auto;
    padding: 12px 8px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: #ddd;
      border-radius: 2px;
    }

    // 媒体/图片列表
    .mediaList {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(0, 150px));
      gap: 10px;

      .mediaItem {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: #fff;
        border: 2px solid transparent;
        border-radius: 12px;
        cursor: grab;
        transition: all 0.2s;
        position: relative;
        &:hover {
          border-color: var(--td-brand-color-10);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }

        &.dragging {
          opacity: 0.6;
          cursor: grabbing;
          transform: scale(0.95);
        }

        .mediaItemPreview {
          width: 36px;
          height: 36px;
          @extend %flex-center;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;

          .mediaItemThumbnail {
            width: 100%;
            height: 100%;
            object-fit: cover;
            position: absolute;
            inset: 0;
            border-radius: 8px;
          }

          .mediaItemLoading {
            position: absolute;
            inset: 0;
            @extend %flex-center;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 8px;
          }
        }

        .mediaItemInfo {
          flex: 1;
          min-width: 0;
          .selected {
            position: absolute;
            top: 0px;
            right: 2px;
            z-index: 1;
          }
          .mediaItemName {
            font-size: 12px;
            font-weight: 400;
            color: #333;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
        }
      }
    }

    // 转场列表
    .transitionList {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(0, 150px));
      gap: 10px;

      .transitionItem {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: #fff;
        border: 2px solid transparent;
        border-radius: 12px;
        cursor: grab;
        transition: all 0.2s;

        &:hover {
          border-color: var(--td-brand-color-10);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }

        &.dragging {
          opacity: 0.6;
          cursor: grabbing;
          transform: scale(0.95);
        }

        .transitionItemPreview {
          width: 36px;
          height: 36px;
          @extend %flex-center;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
          font-size: 18px;
          flex-shrink: 0;
        }

        .transitionItemName {
          font-size: 12px;
          font-weight: 400;
          color: #333;
          line-height: 1.4;
        }
      }
    }

    // 特效列表
    .effectList {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(0, 150px));
      gap: 10px;

      .effectItem {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: #fff;
        border: 2px solid transparent;
        border-radius: 12px;
        cursor: grab;
        transition: all 0.2s;

        &:hover {
          border-color: var(--td-brand-color-10);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }

        &.dragging {
          opacity: 0.6;
          cursor: grabbing;
          transform: scale(0.95);
        }

        .effectItemPreview {
          width: 36px;
          height: 36px;
          @extend %flex-center;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
          flex-shrink: 0;
        }

        .effectItemName {
          font-size: 12px;
          font-weight: 400;
          color: #333;
          line-height: 1.4;
        }
      }
    }

    // 滤镜列表
    .filterList {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(0, 150px));
      gap: 10px;

      .filterItem {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: #fff;
        border: 2px solid transparent;
        border-radius: 12px;
        cursor: grab;
        transition: all 0.2s;

        &:hover {
          border-color: var(--td-brand-color-10);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }

        &.dragging {
          opacity: 0.6;
          cursor: grabbing;
          transform: scale(0.95);
        }

        .filterItemPreview {
          width: 36px;
          height: 36px;
          @extend %flex-center;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
          flex-shrink: 0;
        }

        .filterItemName {
          font-size: 12px;
          font-weight: 400;
          color: #333;
          line-height: 1.4;
        }
      }
    }

    // 音频列表
    .audioList {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(0, 150px));
      gap: 10px;

      .audioItem {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: #fff;
        border: 2px solid transparent;
        border-radius: 12px;
        cursor: grab;
        transition: all 0.2s;

        &:hover {
          border-color: var(--td-brand-color-10);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }

        &.dragging {
          opacity: 0.6;
          cursor: grabbing;
          transform: scale(0.95);
        }

        .audioItemPreview {
          width: 36px;
          height: 36px;
          @extend %flex-center;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
          flex-shrink: 0;
          position: relative;

          .mediaItemLoading {
            position: absolute;
            inset: 0;
            @extend %flex-center;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 8px;
          }
        }

        .audioItemInfo {
          flex: 1;
          min-width: 0;

          .audioItemName {
            font-size: 12px;
            font-weight: 400;
            color: #333;
            line-height: 1.4;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }

    // 文本列表
    .textList {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(0, 150px));
      gap: 10px;
      .textItem {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: #fff;
        border: 2px solid transparent;
        border-radius: 12px;
        cursor: grab;
        transition: all 0.2s;

        &:hover {
          border-color: var(--td-brand-color-10);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }

        &.dragging {
          opacity: 0.6;
          cursor: grabbing;
          transform: scale(0.95);
        }

        .textItemPreview {
          width: 36px;
          height: 36px;
          @extend %flex-center;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
          flex-shrink: 0;

          .textItemContent {
            font-size: 14px;
            font-weight: 600;
            color: var(--td-brand-color-10);
          }
        }

        .textItemName {
          font-size: 12px;
          font-weight: 400;
          color: #333;
          line-height: 1.4;
        }
      }
    }
  }
}
</style>
