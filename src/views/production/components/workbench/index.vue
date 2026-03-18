<template>
  <t-dialog
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
      <generate v-show="activeMenu === 'generate'" />
      <editVideo
        v-if="activeMenu === 'editVideo'"
        :initial-tracks="mockTracks"
        :initial-media-items="mockMediaItems"
        :initial-audio-items="mockAudioItems"
        :initial-image-items="mockImageItems"
        :canvas-width="canvasWidth"
        :canvas-height="canvasHeight" />
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import preview from "./preview.vue";
import generate from "./generate.vue";
import editVideo from "./editVideo/index.vue";
import { generateId, type Track, type MediaClip, type SubtitleClip, type FilterClip, type TransitionClip, type Clip } from "vue-clip-track";
import type { MediaItem, AudioItem } from "./editVideo/utils/mediaData";

const visible = defineModel("visible", {
  type: Boolean,
  default: false,
});

const activeMenu = ref("preview");

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

/** 轨道初始数据 */
function createDemoTracks(): Track[] {
  // 主视频轨道（带转场）
  const mainTrack: Track = {
    id: generateId("track-"),
    type: "video",
    name: "主轨道（视频）",
    visible: true,
    locked: false,
    clips: [],
    order: 0,
    isMain: true,
  };

  const mainClips: Array<MediaClip | TransitionClip> = [
    {
      id: generateId("clip-"),
      trackId: mainTrack.id,
      type: "video",
      startTime: 0,
      endTime: 5,
      selected: false,
      sourceUrl: "https://webav-tech.github.io/WebAV/video/bunny_0.mp4",
      originalDuration: 23,
      trimStart: 0,
      trimEnd: 5,
      playbackRate: 1,
      thumbnails: [],
    } as MediaClip,
    {
      id: generateId("clip-"),
      trackId: mainTrack.id,
      type: "transition",
      startTime: 4.5,
      endTime: 5.5,
      selected: false,
      transitionType: "fade",
      transitionDuration: 1,
      name: "淡入淡出",
    } as TransitionClip,
    {
      id: generateId("clip-"),
      trackId: mainTrack.id,
      type: "video",
      startTime: 5,
      endTime: 11,
      selected: false,
      sourceUrl: "https://webav-tech.github.io/WebAV/video/bunny_0.mp4",
      originalDuration: 20,
      trimStart: 2,
      trimEnd: 8,
      playbackRate: 1,
      thumbnails: [],
    } as MediaClip,
    {
      id: generateId("clip-"),
      trackId: mainTrack.id,
      type: "transition",
      startTime: 10.5,
      endTime: 11.5,
      selected: false,
      transitionType: "slide",
      transitionDuration: 1,
      name: "滑动",
    } as TransitionClip,
    {
      id: generateId("clip-"),
      trackId: mainTrack.id,
      type: "video",
      startTime: 11,
      endTime: 16,
      selected: false,
      sourceUrl: "https://webav-tech.github.io/WebAV/video/bunny_0.mp4",
      originalDuration: 16,
      trimStart: 1,
      trimEnd: 6,
      playbackRate: 1.5,
      thumbnails: [],
    } as MediaClip,
  ];
  mainTrack.clips = mainClips as Clip[];

  // 音频轨道
  const audioTrack: Track = {
    id: generateId("track-"),
    type: "audio",
    name: "音频1",
    visible: true,
    locked: false,
    clips: [],
    order: 2,
  };
  const audioClips: MediaClip[] = [
    {
      id: generateId("clip-"),
      trackId: audioTrack.id,
      type: "audio",
      startTime: 0,
      endTime: 8,
      selected: false,
      sourceUrl: "https://webav-tech.github.io/WebAV/audio/16kHz-1chan.mp3",
      originalDuration: 0,
      trimStart: 0,
      trimEnd: 8,
      playbackRate: 1,
      volume: 0.8,
      waveformData: [],
    },
    {
      id: generateId("clip-"),
      trackId: audioTrack.id,
      type: "audio",
      startTime: 10,
      endTime: 18,
      selected: false,
      sourceUrl: "https://webav-tech.github.io/WebAV/audio/16kHz-1chan.mp3",
      originalDuration: 0,
      trimStart: 1,
      trimEnd: 9,
      playbackRate: 1,
      volume: 1.0,
      waveformData: [],
    },
  ];
  audioTrack.clips = audioClips;

  // 字幕轨道
  const subtitleTrack: Track = {
    id: generateId("track-"),
    type: "subtitle",
    name: "字幕1",
    visible: true,
    locked: false,
    clips: [],
    order: 3,
  };
  const subtitleClips: SubtitleClip[] = [
    {
      id: generateId("clip-"),
      trackId: subtitleTrack.id,
      type: "subtitle",
      startTime: 1,
      endTime: 3,
      selected: false,
      text: "这是第一段字幕",
      fontFamily: "Arial",
      fontSize: 24,
      color: "#ffffff",
      textAlign: "center",
    },
    {
      id: generateId("clip-"),
      trackId: subtitleTrack.id,
      type: "subtitle",
      startTime: 5,
      endTime: 8,
      selected: false,
      text: "这是第二段字幕，内容更长一些",
      fontFamily: "Arial",
      fontSize: 24,
      color: "#ffff00",
      textAlign: "center",
    },
    {
      id: generateId("clip-"),
      trackId: subtitleTrack.id,
      type: "subtitle",
      startTime: 10,
      endTime: 14,
      selected: false,
      text: "最后一段字幕",
      fontFamily: "Arial",
      fontSize: 24,
      color: "#ffffff",
      textAlign: "center",
    },
  ];
  subtitleTrack.clips = subtitleClips;

  // 滤镜轨道
  const filterTrack: Track = {
    id: generateId("track-"),
    type: "filter",
    name: "滤镜1",
    visible: true,
    locked: false,
    clips: [],
    order: 4,
  };
  const filterClips: FilterClip[] = [
    {
      id: generateId("clip-"),
      trackId: filterTrack.id,
      type: "filter",
      startTime: 2,
      endTime: 6,
      selected: false,
      filterType: "blur",
      filterValue: 5,
      name: "模糊滤镜",
    },
    {
      id: generateId("clip-"),
      trackId: filterTrack.id,
      type: "filter",
      startTime: 8,
      endTime: 12,
      selected: false,
      filterType: "brightness",
      filterValue: 1.5,
      name: "亮度调整",
    },
  ];
  filterTrack.clips = filterClips;

  return [mainTrack, audioTrack, subtitleTrack, filterTrack];
}

const mockTracks = createDemoTracks();
</script>

<style lang="scss" scoped>
.fullscreenDialog {
  :deep(.t-dialog__body) {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
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
