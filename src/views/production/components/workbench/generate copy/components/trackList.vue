<template>
  <t-card bordered :style="{ width: '100%', height: '100%' }">
    <div class="operate jb">
      <div class="selectAll ac">
        <t-checkbox v-model="checkAll" @change="handleCheckAll">{{ $t("workbench.generate.selectAll") }}</t-checkbox>
        <span class="selectedCount" v-if="checkedTrackIds.length">{{ $t("workbench.generate.selected") }} {{ checkedTrackIds.length }} 段</span>
      </div>
      <div class="batchBtn">
        <t-button size="small" variant="outline" @click="batchDownloadVideo">{{ $t("workbench.generate.batchDownloadVideo") }}</t-button>
        <t-button size="small" variant="outline" @click="batchGenText" style="margin-left: 5px">
          {{ $t("workbench.generate.batchGenerateText") }}
        </t-button>
        <t-button size="small" variant="outline" @click="batchGenVideo" style="margin-left: 5px">
          {{ $t("workbench.generate.batchGenerateVideo") }}
        </t-button>
      </div>
    </div>
    <div class="trackList f">
      <div
        v-for="(item, index) in trackList"
        :key="index"
        :class="{ active: index === activeTrackIndex }"
        @click="changeTrack(index)"
        class="trackData trackItemWrapper">
        <t-image src="https://tdesign.gtimg.com/demo/demo-image-1.png" shape="round" fit="cover" class="trackImage" />
        <div class="check">
          <t-checkbox
            :checked="item.id != null && checkedTrackIds.includes(item.id)"
            @click.stop
            @change="(val: boolean) => toggleCheck(item.id, val)" />
        </div>
        <div class="del">
          <i-delete theme="outline" size="16" fill="#d0021b" />
        </div>
        <div class="serialNumber">
          <t-tag size="small">#{{ index + 1 }}</t-tag>
        </div>
      </div>
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { ref } from "vue";
//视频轨道
interface TrackMediaBase {
  src: string;
  id?: number;
  prompt?: string;
  fileType: "image" | "video" | "audio";
  index?: number;
}
interface TrackMediaStoryboard extends TrackMediaBase {
  sources: "storyboard";
  index?: number;
}

interface TrackMediaAssets extends TrackMediaBase {
  sources: "assets";
}

interface TrackMediaUnknown extends TrackMediaBase {
  sources?: string;
}
interface VideoItem {
  id: number;
  src: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  errorReason?: string | null;
}
type TrackMedia = TrackMediaStoryboard | TrackMediaAssets | TrackMediaUnknown;
interface TrackItem {
  id: number;
  prompt: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  reason?: string;
  selectVideoId?: number | null;
  medias: TrackMedia[];
  videoList: VideoItem[];
  duration: number;
}
const props = defineProps({
  trackList: {
    type: Array as () => TrackItem[],
    default: () => [],
  },
});
//当前选中的组
const activeTrackIndex = defineModel({
  type: Number,
  default: 0,
});
function changeTrack(index: number) {
  activeTrackIndex.value = index;
}
// 全选状态
const checkAll = ref(false);
// 已勾选的轨道 id
const checkedTrackIds = ref<number[]>([]);
/** 全选 / 取消全选轨道 */
function handleCheckAll(val: boolean) {
  const allIds = props.trackList.map((t) => t.id).filter((id): id is number => id != null);
  checkedTrackIds.value = val ? allIds : [];
}
//单选轨道
function toggleCheck(trackId: number | undefined, val: boolean) {
  if (trackId == null) return;
  if (val) {
    if (!checkedTrackIds.value.includes(trackId)) checkedTrackIds.value.push(trackId);
  } else {
    checkedTrackIds.value = checkedTrackIds.value.filter((id) => id !== trackId);
  }
  const allIds = props.trackList.map((t) => t.id).filter((id): id is number => id != null);
  checkAll.value = allIds.length > 0 && allIds.every((id) => checkedTrackIds.value.includes(id));
}
//批量下载视频
function batchDownloadVideo() {}
//批量生成提示词
function batchGenText() {}
//批量生成视频
function batchGenVideo() {}
</script>

<style lang="scss" scoped>
.operate {
  border-bottom: 1px solid var(--td-component-border);
  .selectAll {
    .selectedCount {
      margin-left: 5px;
    }
  }
}
.trackList {
  gap: 10px;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  flex-wrap: nowrap;
  align-items: flex-start;
  padding: 6px 4px;
  .trackItemWrapper {
    flex-shrink: 0;
    margin-top: 10px;
    padding: 2px;
  }
  .trackData {
    position: relative;
    border-radius: 6px;
    border: 2px solid transparent;
    transition: border-color 0.2s, box-shadow 0.2s;
    .trackImage {
      width: 100px;
      height: 100px;
      cursor: pointer;
      display: block;
      border-radius: 4px;
    }
    .check {
      position: absolute;
      top: 5px;
      left: 5px;
      z-index: 1;
    }
    .del {
      position: absolute;
      top: 5px;
      right: 5px;
      z-index: 1;
      cursor: pointer;
    }
    .serialNumber {
      position: absolute;
      bottom: 5px;
      left: 5px;
      z-index: 1;
    }
  }
  .active {
    border-color: var(--td-brand-color);
    box-shadow: 0 0 0 2px rgba(var(--td-brand-color-rgb, 0, 82, 217), 0.25);
    background: linear-gradient(180deg, rgba(var(--td-brand-color-rgb, 0, 82, 217), 0.05) 0%, transparent 100%);
  }
}
</style>
