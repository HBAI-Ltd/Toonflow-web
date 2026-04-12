<template>
  <div class="generate">
    <div class="data f">
      <div class="videogenerate">
        <videogenerate :trackList="trackList" v-model="activeTrackIndex" :generateData="generateData" v-model:videoUrl="videoUrl" />
      </div>
    </div>
    <div class="track">
      <newTrack :trackList="trackList" v-model="activeTrackIndex" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import videogenerate from "./components/videogenerate.vue";
import newTrack from "./components/trackList.vue";
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
interface StoryboardItem {
  src: string;
  createTime?: number | null;
  duration?: string | null;
  flowId?: number | null;
  id?: number;
  index?: number | null;
  projectId?: number | null;
  prompt?: string | null;
  reason?: string | null;
  scriptId?: number | null;
  state?: string | null;
  trackId?: number | null;
}
//获取组数据
const trackList = ref<TrackItem[]>([]);
const storyboardList = ref<StoryboardItem[]>([]); // 分镜列表
//当前选中的组
const activeTrackIndex = ref(0);
//当前预览的视频
const videoUrl = ref("");
//生成所需数据
const generateData = ref({
  selectModel: "",
  selectMode: "",
  selectedAudio: false,
  selectedResolution: "",
  selectedDuration: 0,
});
const { project } = storeToRefs(projectStore());
const episodesId = inject<Ref<number>>("episodesId")!;
//获取组数据
async function getGenerateData() {
  const { data } = await axios.post("/production/workbench/getGenerateData", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
  });
  trackList.value = data.trackList;
  storyboardList.value = data.storyboardList;
}
onMounted(() => {
  generateData.value.selectModel = project.value?.videoModel || "";
  generateData.value.selectMode = project.value?.mode || "";
  getGenerateData();
});
</script>

<style lang="scss" scoped>
.generate {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  gap: 16px;
  overflow: hidden;
  .data {
    width: 100%;
    flex: 1;
    gap: 10px;
    min-height: 0;
    overflow: hidden;
    .videoPreview {
      width: 50%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .videogenerate {
      width: 50%;
      height: 100%;
      overflow-y: auto;
      min-height: 0;
    }
  }
}
</style>
