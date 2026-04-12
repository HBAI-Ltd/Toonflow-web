<template>
  <div class="videoTrack">
    <t-card bordered :style="{ height: '100%' }">
      <div class="trackMenu f ac jb">
        <div class="left f ac">
          <t-checkbox v-model="checkAll" @change="handleCheckAll">{{ $t("workbench.generate.selectAll") }}</t-checkbox>
          <span class="selectedCount" v-if="checkedTrackIds.length">{{ $t("workbench.generate.selected") }} {{ checkedTrackIds.length }} 段</span>
        </div>
        <div class="right f ac">
          <t-button size="small" variant="outline" @click="batchDownloadVideo">{{ $t("workbench.generate.batchDownloadVideo") }}</t-button>
          <t-button size="small" variant="outline" @click="batchGenText">{{ $t("workbench.generate.batchGenerateText") }}</t-button>
          <t-button size="small" variant="outline" @click="batchGenVideo">{{ $t("workbench.generate.batchGenerateVideo") }}</t-button>
          <!-- <t-button size="small" variant="outline" @click="importVideo">{{ $t("workbench.generate.importVideo") }}</t-button> -->
        </div>
      </div>
      <div class="itemBox">
        <div
          class="item"
          :class="{ active: index === activeTrackIndex }"
          v-for="(track, index) in trackList"
          :key="index"
          @click="changeIndex(index)">
          <t-checkbox
            class="trackCheck"
            :checked="track.id != null && checkedTrackIds.includes(track.id)"
            @click.stop
            @change="(val: boolean) => toggleCheck(track.id, val)" />
          <t-tag class="indexTag" size="small">#{{ index + 1 }}</t-tag>
          <t-tag class="selectTag" theme="success" size="small" v-if="track.selectVideoId">已选择</t-tag>
          <!-- 优先展示选中视频的首帧 -->
          <div class="thumbGroup" v-if="track.selectVideoId && getSelectedVideoSrc(track)">
            <img
              v-if="videoCoverMap[getSelectedVideoSrc(track)!]"
              class="thumb selectedVideoThumb"
              :src="videoCoverMap[getSelectedVideoSrc(track)!]"
              draggable="false" />
            <div v-else class="thumb placeholder c">
              <i-video size="24" />
            </div>
          </div>
          <!-- 无选中视频时展示参考素材缩略图 -->
          <div class="thumbGroup" v-else-if="track.medias.some((m) => m.src)">
            <template v-for="(m, i) in track.medias" :key="i">
              <template v-if="m.src">
                <t-image fit="cover" v-if="m.fileType === 'image'" :src="m.src" class="thumb" />
                <div v-else class="thumb placeholder c">
                  <i-volume-notice v-if="m.fileType === 'audio'" size="20" />
                  <i-video v-else size="24" />
                </div>
              </template>
            </template>
          </div>
          <span v-else class="emptyTrack">{{ $t("workbench.generate.emptyTrack", { index }) }}</span>
          <div class="deleteBtn" @click.stop="confirmDeleteTrack(index)">
            <i-close size="14" />
          </div>
        </div>
        <div class="item addItem c" @click="addTrack">
          <i-plus size="36"></i-plus>
        </div>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import "@/views/production/components/workbench/type/type";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import JSZip from "jszip";

const { project } = storeToRefs(projectStore());
const episodesId = inject<Ref<number>>("episodesId")!;
const props = defineProps<{
  modelParmas: ModelSetting;
  imageList: UploadItem[];
  clampDuration: (trackDuration: number) => number;
}>();
const activeTrackIndex = defineModel("activeTrackIndex", {
  default: 0,
});
const checkedTrackIds = ref<number[]>([]); // 已勾选的轨道 id
const trackList = defineModel<TrackItem[]>({
  default: () => [],
});
const genTextLoadingMap = defineModel<Record<number, boolean>>("genTextLoadingMap", {
  default: () => {},
});
const emit = defineEmits<{
  getData: [];
  change: [prevIndex: number];
  saveImageList: [trackId: number];
}>();
const checkAll = ref(false); // 全选状态

/** 视频封面缓存 src -> dataURL */
const videoCoverMap = ref<Record<string, string>>({});

/** 获取轨道选中视频的 src */
function getSelectedVideoSrc(track: TrackItem): string | null {
  if (!track.selectVideoId) return null;
  const video = track.videoList?.find((v) => v.id === track.selectVideoId);
  return video?.src || null;
}

/** 截取视频首帧封面 */
function captureVideoCover(src: string) {
  if (!src || videoCoverMap.value[src]) return;
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.preload = "auto";
  video.muted = true;
  video.src = src;
  video.addEventListener(
    "seeked",
    () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 160;
        canvas.height = video.videoHeight || 90;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          videoCoverMap.value[src] = canvas.toDataURL("image/jpeg", 0.7);
        }
      } catch {}
      video.src = "";
    },
    { once: true },
  );
  video.addEventListener(
    "loadeddata",
    () => {
      video.currentTime = 0;
    },
    { once: true },
  );
  video.addEventListener(
    "error",
    () => {
      video.src = "";
    },
    { once: true },
  );
  video.load();
}

function changeIndex(index: number) {
  if (activeTrackIndex.value == index) return;
  const prevIndex = activeTrackIndex.value;
  activeTrackIndex.value = index;
  emit("change", prevIndex);
}
/** 删除轨道请求 */
async function deleteTrack(index: number) {
  const track = trackList.value[index];
  if (!track) return;
  await axios.post("/production/workbench/deleteTrack", { id: track.id });
  if (activeTrackIndex.value >= trackList.value.length) {
    activeTrackIndex.value = trackList.value.length - 1;
  }
}
function confirmDeleteTrack(index: number) {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.generate.del"),
    body: $t("workbench.generate.delConfirm"),
    confirmBtn: $t("settings.generate.delConfirmBtn"),
    cancelBtn: $t("settings.memory.msg.cancel"),
    onConfirm: async () => {
      try {
        await deleteTrack(index);
        window.$message.success($t("workbench.generate.delSuccess"));
        emit("getData");
      } catch (e: any) {
        window.$message.error(e.message ?? $t("workbench.cornerScape.cancelGeneration") + "失败");
      } finally {
        dialog.destroy();
      }
    },
  });
}
async function addTrack() {
  const { data: modelData } = await axios.post("/modelSelect/getModelDetail", { modelId: props.modelParmas.model });
  const drMap = modelData.durationResolutionMap;
  if (!Array.isArray(drMap) || drMap.length === 0 || !drMap[0].duration?.length) return;
  const duration = drMap[0].duration[0];
  const { data } = await axios.post("/production/workbench/addTrack", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
    duration,
  });
  // await getGenerateData();
  emit("getData");
  activeTrackIndex.value = trackList.value.length - 1;
}
/** 获取 URL 中的文件扩展名 */
function getFileExtension(url: string): string {
  const ext = url.split(".").pop()?.split(/[#?]/)[0];
  return ext || "mp4";
}
/** 批量下载已勾选轨道的选中视频，打包为 zip */
async function batchDownloadVideo(): Promise<void> {
  const zip = new JSZip();
  const selectedTracks = trackList.value.filter((track) => checkedTrackIds.value.includes(track.id));
  const tasks = selectedTracks
    .map((track) => {
      const video = track.videoList.find((v) => v.id === track.selectVideoId);
      if (!video?.src) return null;
      const filename = `分镜${track.id}.${getFileExtension(video.src)}`;
      return fetch(video.src)
        .then((res) => res.blob())
        .then((blob) => zip.file(filename, blob))
        .catch((err) => console.error(`视频下载失败: ${video.src}`, err));
    })
    .filter(Boolean);
  await Promise.all(tasks);
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `视频批量下载_${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  checkedTrackIds.value = [];
  checkAll.value = false;
}
function batchGenText() {
  trackList.value
    .filter((track) => checkedTrackIds.value.includes(track.id))
    .forEach(async (track) => {
      const trackId = track.id;
      let info = [];
      if (props.modelParmas.mode == "text") {
        info = track?.medias.map(({ id, sources }) => ({ id, sources }));
      } else {
        info = getTrackUploadInfo(track);
      }
      if (genTextLoadingMap.value[trackId]) return;
      genTextLoadingMap.value[trackId] = true;
      try {
        const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
          projectId: project.value?.id,
          trackId,
          info,
          model: props.modelParmas.model,
        });
        const targetTrack = trackList.value.find((item) => item.id === trackId);
        if (targetTrack) targetTrack.prompt = data;
        checkedTrackIds.value = [];
        checkAll.value = false;
      } catch (e) {
        window.$message.error((e as Error)?.message ?? "提示词生成失败");
      } finally {
        genTextLoadingMap.value[trackId] = false;
      }
    });
}
/**
 * 获取指定轨道的上传数据：
 * 当前活动轨道 → uploadBox（含未保存的最新编辑）
 * 其他轨道 → uploadBoxCache（含切换前的编辑）→ 降级 track.medias
 * @param filterEmpty 是否过滤掉没有 src 的项（生成视频时需要过滤，生成提示词时不需要）
 */
function getTrackUploadInfo(track: TrackItem, filterEmpty = false) {
  const activeTrackId = trackList.value[activeTrackIndex.value]?.id;

  if (track.id === activeTrackId) {
    const items = props.imageList as UploadItem[];
    return (filterEmpty ? items.filter((item) => Boolean(item.src)) : items).map(({ id, sources }) => ({
      id,
      sources: (sources ?? "storyboard") as string,
    }));
  }
  return track.medias.filter((m) => !filterEmpty || Boolean(m.src)).map(({ id, sources }) => ({ id, sources: (sources ?? "storyboard") as string }));
}
/** 批量为已勾选轨道生成视频 */
function batchGenVideo() {
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.generateConfirm"),
    body: $t("workbench.generate.generateVideosInBatches"),
    onConfirm: async () => {
      dlg.destroy();
      trackList.value
        .filter((track) => checkedTrackIds.value.includes(track.id))
        .forEach(async (track) => {
          const trackId = track.id;
          try {
            const uploadData = props.modelParmas.mode === "text" ? [] : getTrackUploadInfo(track, true);
            const payload = {
              projectId: project.value?.id,
              scriptId: episodesId.value,
              duration: props.clampDuration(track.duration || props.modelParmas.duration),
              uploadData,
              prompt: track.prompt,
              model: props.modelParmas.model,
              mode: props.modelParmas.mode,
              resolution: props.modelParmas.resolution,
              audio: Boolean(props.modelParmas.audio),
              trackId,
            };
            if (!payload.prompt) return window.$message.warning($t("workbench.generate.skipDataWithEmptyVideoPromptWords"));
            const { data } = await axios.post("/production/workbench/generateVideo", payload);
            track.videoList.push({
              id: data,
              state: "生成中",
              src: "",
            });
            window.$message.success($t("workbench.generate.generateStarted"));
          } catch (e) {
            window.$message.error((e as any)?.message ?? "视频发起生成请求失败");
          } finally {
          }
        });
    },
    onCancel: () => dlg.destroy(),
  });
}

/** 全选 / 取消全选轨道 */
function handleCheckAll(val: boolean) {
  const allIds = trackList.value.map((t) => t.id).filter((id): id is number => id != null);
  checkedTrackIds.value = val ? allIds : [];
}

/** 单个勾选轨道 */
function toggleCheck(trackId: number | undefined, val: boolean) {
  if (trackId == null) return;
  if (val) {
    if (!checkedTrackIds.value.includes(trackId)) checkedTrackIds.value.push(trackId);
  } else {
    checkedTrackIds.value = checkedTrackIds.value.filter((id) => id !== trackId);
  }
  const allIds = trackList.value.map((t) => t.id).filter((id): id is number => id != null);
  checkAll.value = allIds.length > 0 && allIds.every((id) => checkedTrackIds.value.includes(id));
}

// 轨道列表变化时，清理已失效的 id，并截取选中视频首帧
watch(
  trackList,
  (list) => {
    // 为有选中视频的轨道截取首帧
    list.forEach((track) => {
      const src = getSelectedVideoSrc(track);
      if (src) captureVideoCover(src);
    });
  },
  { deep: true, immediate: true },
);
</script>

<style lang="scss" scoped>
.videoTrack {
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  .trackMenu {
    margin-bottom: 10px;
    .selectedCount {
      font-size: 12px;
      color: var(--td-text-color-secondary);
      margin-left: 8px;
    }
    .right {
      gap: 8px;
    }
  }
  .itemBox {
    height: 150px;
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    overflow-x: auto;
    gap: 10px;
    &::-webkit-scrollbar {
      height: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background: #696969;
      border-radius: 3px;
    }
    .item {
      border-radius: 8px;
      flex-shrink: 0;
      width: 200px;
      border: 1px solid var(--td-gray-color-3);
      overflow: hidden;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      &.active {
        border-color: var(--td-brand-color);
        border-width: 2px;
        box-shadow: 0 0 0 3px rgba(var(--td-brand-color-rgb, 0, 82, 217), 0.25);
        background: linear-gradient(180deg, rgba(var(--td-brand-color-rgb, 0, 82, 217), 0.05) 0%, transparent 100%);
      }
      &:hover {
        filter: brightness(90%);
      }
      .indexTag {
        position: absolute;
        bottom: 4px;
        left: 4px;
        z-index: 2;
      }
      .selectTag {
        position: absolute;
        bottom: 4px;
        right: 4px;
        z-index: 1;
      }
      .thumbGroup {
        width: 100%;
        height: 100%;
        display: flex;
        .thumb {
          flex: 1;
          min-width: 0;
          height: 100%;
          object-fit: cover;
        }
        .placeholder {
          background: var(--td-bg-color-secondarycontainer);
          color: var(--td-text-color-placeholder);
          font-size: 12px;
        }
      }
      .emptyTrack {
        color: var(--td-text-color-placeholder);
        font-size: 12px;
      }
      .trackCheck {
        position: absolute;
        top: 4px;
        left: 4px;
        z-index: 2;
      }
      .deleteBtn {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1;
        &:hover {
          background: rgba(0, 0, 0, 0.8);
        }
      }
      &:hover .deleteBtn {
        display: flex;
      }
    }
    .addItem {
      border: 4px dashed var(--td-component-border);
      cursor: pointer;
    }
    .selectedVideoThumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      pointer-events: none;
      user-select: none;
      display: block;
    }
  }
}
</style>
