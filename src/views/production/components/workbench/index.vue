<template>
  <t-dialog
    body="String"
    :header="false"
    :footer="false"
    :closeBtn="false"
    v-model:visible="visible"
    attach="body"
    placement="center"
    mode="full-screen"
    dialogClassName="noFooter"
    class="fullscreenDialog">
    <div class="closure">
      <i-close-small theme="outline" size="24" fill="#4a4a4a" @click="visible = false" />
    </div>
    <div class="topMenu f ac">
      <t-tooltip content="快速预览" placement="bottom" theme="light" destroyOnClose :showArrow="false">
        <div class="item fc c" :class="{ active: activeMenu === 'preview' }" @click="activeMenu = 'preview'">
          <i-blackboard class="icon" />
        </div>
      </t-tooltip>
      <t-tooltip content="视频生成" placement="bottom" theme="light" destroyOnClose :showArrow="false">
        <div class="item fc c" :class="{ active: activeMenu === 'generate' }" @click="activeMenu = 'generate'">
          <i-playback-progress class="icon" />
        </div>
      </t-tooltip>
      <t-tooltip content="视频剪辑" placement="bottom" theme="light" destroyOnClose :showArrow="false">
        <div class="item fc c" :class="{ active: activeMenu === 'editVideo' }" @click="activeMenu = 'editVideo'">
          <i-editing class="icon" />
        </div>
      </t-tooltip>
    </div>
    <div class="content">
      <preview v-if="activeMenu === 'preview'" />
      <generate v-show="activeMenu === 'generate'" @close="handleBatchDownload" v-model="extractLines" />
      <editVideo
        v-show="activeMenu === 'editVideo'"
        :initial-media-items="mockMediaItems"
        :initial-audio-items="mockAudioItems"
        :initial-image-items="mockImageItems"
        :canvas-width="canvasWidth"
        :canvas-height="canvasHeight"
        ref="editVideoRef" />
    </div>
    <div v-if="importLoading" class="importLoadingMask">
      <div class="importLoadingContent">
        <t-loading size="large" text="正在导入剪辑台，请稍候..." />
      </div>
    </div>
    <t-dialog theme="info" header="提示" body="是否从提取台词" v-model:visible="visible1">
      <template #footer>
        <div class="f ac" style="display: flex; justify-content: flex-end">
          <t-button variant="outline" @click="visible1 = false">取 消</t-button>
          <t-button variant="outline" @click="noFn">否</t-button>
          <t-button @click="onConfirm">确 定</t-button>
        </div>
      </template>
      <template #default>
        <div class="f f-column" style="gap: 12px">
          <span>是否从提取台词？</span>
        </div>
      </template>
    </t-dialog>
  </t-dialog>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import preview from "./preview.vue";
import generate from "./generate.vue";
import editVideo from "./editVideo/index.vue";
import { generateId, useTracksStore, type Track, type MediaClip, type SubtitleClip, type Clip } from "vue-clip-track";
import type { MediaItem, AudioItem } from "./editVideo/utils/mediaData";

const visible = defineModel("visible", {
  type: Boolean,
  default: false,
});

const activeMenu = ref("preview");
const editVideoRef = ref();
const tracksStore = useTracksStore();

// 画布尺寸配置
const canvasWidth = ref(1920);
const canvasHeight = ref(1080);

// ============ 演示数据（可替换为在线资源地址） ============

/** 资源库 - 视频素材 */
const mockMediaItems: MediaItem[] = [
  {
    id: "video-1",
    type: "video",
    name: "Bunny 0",
    duration: 0,
    icon: "🎥",
    color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    url: "https://webav-tech.github.io/WebAV/video/bunny_0.mp4",
    loading: true,
  },
];

/** 资源库 - 音频素材 */
const mockAudioItems: AudioItem[] = [
  {
    id: "audio-1",
    type: "audio",
    name: "44.1kHz 立体声",
    duration: 0,
    url: "https://webav-tech.github.io/WebAV/audio/16kHz-1chan.mp3",
    loading: true,
  },
  { id: "audio-2", type: "audio", name: "16kHz 单声道", duration: 0, url: "https://webav-tech.github.io/WebAV/audio/16kHz-1chan.mp3", loading: true },
];

/** 资源库 - 图片素材 */
const mockImageItems: MediaItem[] = [
  {
    id: "image-1",
    type: "image",
    name: "示例图片 1",
    duration: 5,
    icon: "🖼️",
    color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    url: "https://webav-tech.github.io/WebAV/img/bunny.png",
    loading: true,
  },
];

const visible1 = ref(false);
const extractLines = ref(false);
const batchDownloadValue = ref<any>(null);
const importLoading = ref(false);

async function onConfirm() {
  visible1.value = false;
  extractLines.value = true;
  importLoading.value = true;
  try {
    const value = batchDownloadValue.value;
    const list = batchDownloadValue.value.map((item: any) => ({
      videoId: item.videoId,
      prompt: item.prompt,
    }));
    const { data } = await axios.post("/production/workbench/getChatLines", { list });
    appendClipsToStore(value, data);
    activeMenu.value = "editVideo";
  } finally {
    importLoading.value = false;
  }
}

function noFn() {
  visible1.value = false;
  importLoading.value = true;
  try {
    const value = batchDownloadValue.value;
    appendClipsToStore(value, null);
    activeMenu.value = "editVideo";
  } finally {
    importLoading.value = false;
  }
}

/** 追加视频片段（以及可选的字幕）到 tracksStore 对应轨道末尾 */
function appendClipsToStore(videoList: any[], subtitleData: any[] | null) {
  let videoTrack = tracksStore.tracks.find((t) => t.type === "video" && t.isMain);
  if (!videoTrack) {
    videoTrack = {
      id: generateId("track-"),
      type: "video",
      name: "主轨道（视频）",
      visible: true,
      locked: false,
      clips: [],
      order: 0,
      isMain: true,
    };
    tracksStore.addTrack(videoTrack);
    videoTrack = tracksStore.tracks.find((t) => t.type === "video" && t.isMain)!;
  }

  let subtitleTrack = tracksStore.tracks.find((t) => t.type === "subtitle");
  if (!subtitleTrack && subtitleData) {
    subtitleTrack = {
      id: generateId("track-"),
      type: "subtitle",
      name: "字幕1",
      visible: true,
      locked: false,
      clips: [],
      order: 3,
    };
    tracksStore.addTrack(subtitleTrack);
    subtitleTrack = tracksStore.tracks.find((t) => t.type === "subtitle")!;
  }

  // 计算视频轨道末尾时间
  const existingVideoClips = videoTrack!.clips.filter((c) => c.type !== "transition");
  let currentTime = existingVideoClips.reduce((max, c) => Math.max(max, c.endTime), 0);

  // 追加视频片段
  videoList.forEach((item: any) => {
    const duration = item.duration || 5;
    const clip: MediaClip = {
      id: generateId("clip-"),
      trackId: videoTrack!.id,
      type: "video",
      startTime: currentTime,
      endTime: currentTime + duration,
      selected: false,
      sourceUrl: item.filePath,
      originalDuration: duration,
      trimStart: 0,
      trimEnd: duration,
      playbackRate: 1,
      thumbnails: [],
    };
    tracksStore.addClip(videoTrack!.id, clip as Clip);
    currentTime += duration;
  });

  // 追加字幕片段（如果有），时间与视频对齐
  if (subtitleData && subtitleTrack) {
    const existingSubtitleClips = subtitleTrack.clips;
    let subtitleStart = existingSubtitleClips.reduce((max, c) => Math.max(max, c.endTime), 0);
    // 字幕起点对齐视频追加的起点
    const videoAppendStart = existingVideoClips.reduce((max, c) => Math.max(max, c.endTime), 0);
    subtitleStart = Math.max(subtitleStart, videoAppendStart);

    videoList.forEach((item: any, index: number) => {
      const duration = item.duration || 5;
      const text = subtitleData[index]?.prompt || subtitleData[index]?.text || "";
      if (!text) {
        subtitleStart += duration;
        return;
      }
      const clip: SubtitleClip = {
        id: generateId("clip-"),
        trackId: subtitleTrack!.id,
        type: "subtitle",
        startTime: subtitleStart,
        endTime: subtitleStart + duration,
        selected: false,
        text,
        fontFamily: "Arial",
        fontSize: 24,
        color: "#ffffff",
        textAlign: "center",
      };
      tracksStore.addClip(subtitleTrack!.id, clip as Clip);
      subtitleStart += duration;
    });
  }
}

//导入到剪辑台
function handleBatchDownload(value: any) {
  batchDownloadValue.value = value;
  visible1.value = true;
}
</script>

<style lang="scss" scoped>
.fullscreenDialog {
  :deep(.t-dialog__body) {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  .importLoadingMask {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.85);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
    .importLoadingContent {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
  }
  .closure {
    position: absolute;
    top: var(--td-comp-paddingTB-xl);
    right: var(--td-comp-paddingLR-xxl);
    z-index: 9999;
    cursor: pointer;
  }
  .topMenu {
    padding-bottom: 1rem;
    width: fit-content;
    .item {
      margin-right: 4px;
      cursor: pointer;
      width: 50px;
      height: 50px;
      .icon {
        font-size: 24px;
      }
      .title {
        font-size: 10px;
        white-space: nowrap;
      }
      &:hover {
        background-color: #ecedef;
        border-radius: 16px;
      }
    }
    .active {
      background-color: #000 !important;
      color: #fff;
      border-radius: 16px;
    }
  }
  .content {
    flex: 1;
    overflow: hidden;
  }
  .editStoryboard {
    width: 100%;
    height: 75vh;
  }
}
</style>
