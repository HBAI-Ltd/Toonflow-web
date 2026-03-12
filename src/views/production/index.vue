<template>
  <div class="production">
    <h2>{{ project?.name }}</h2>
    <t-tabs v-model="setData">
      <t-tab-panel v-for="(item, index) in setContent" :key="index" :value="index + ''" :label="item.title">
        <div class="storyboard">
          <div class="head ac jb">
            <div class="headLeft">
              <t-icon name="image" size="20px" style="margin-right: 8px" />
              <span class="title">分镜图</span>
              <t-tag theme="primary" size="small" style="margin-left: 8px">{{ item.storyboard.length }}</t-tag>
            </div>
            <t-button theme="primary">
              <template #icon><t-icon name="add" /></template>
              生成分镜图
            </t-button>
          </div>
          <div class="data">
            <div v-if="item.storyboard.length === 0" class="emptyState">
              <t-icon name="image" size="64px" style="color: #dcdcdc" />
              <p>暂无分镜图</p>
            </div>
            <div v-else class="storyboardGrid">
              <div v-for="(items, indexs) in item.storyboard" :key="indexs" class="storyboardItem" @click="storyboardFn(items)">
                <t-image :src="items.imageUrl" fit="cover" class="storyboardImage" />
                <div class="itemBadge">{{ indexs + 1 }}</div>
                <div class="deleteBtn" @click.stop="delStoryboard">
                  <i-delete theme="outline" size="20" fill="#d0021b" />
                </div>
                <div class="promptInfo">
                  <t-tooltip :content="items.prompt" placement="bottom">
                    <div class="promptText">{{ items.prompt }}</div>
                  </t-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="video">
          <div class="head ac jb">
            <div class="headLeft">
              <t-icon name="video" size="20px" style="margin-right: 8px" />
              <span class="title">视频</span>
              <t-tag theme="primary" size="small" style="margin-left: 8px">{{ item.video.length }}</t-tag>
            </div>
            <t-button theme="primary" @click="addVideoDeployShow = true">
              <template #icon><t-icon name="add" /></template>
              添加视频配置
            </t-button>
          </div>
          <div class="data">
            <div v-if="item.video.length === 0" class="emptyState">
              <t-icon name="video" size="64px" style="color: #dcdcdc" />
              <p>暂无视频</p>
            </div>
            <div v-else class="videoGrid">
              <div v-for="(items, indexs) in item.video" :key="indexs" class="videoItem" @click="editVideoFn(items, indexs)">
                <div class="videoCover">
                  <template v-if="items.videoUrl && items.images?.filter(Boolean).length > 0">
                    <t-image :src="items.images[0]" fit="cover" class="videoImage" />
                    <div class="playIcon">
                      <t-icon name="play-circle" size="48px" />
                    </div>
                  </template>
                  <template v-else>
                    <div class="pendingState">
                      <t-icon name="time" size="32px" />
                      <span>待生成</span>
                    </div>
                  </template>
                </div>
                <div class="itemBadge">{{ indexs + 1 }}</div>
                <div class="deleteBtn" @click.stop="delVideo">
                  <i-delete theme="outline" size="20" fill="#d0021b" />
                </div>
                <div class="videoInfo">
                  <div class="infoRow">
                    <t-tag size="small" variant="light">{{ items.model }}</t-tag>
                    <t-tag size="small" variant="light" theme="primary">{{ items.duration }}s</t-tag>
                  </div>
                  <t-tooltip :content="items.prompt" placement="bottom" :disabled="!items.prompt">
                    <div class="promptText">{{ items.prompt || "暂无提示词" }}</div>
                  </t-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="download">
          <div class="head ac jb">
            <div class="headLeft">
              <i-folder-download theme="outline" size="20" fill="#4a4a4a" style="margin-right: 8px" />
              <span class="title">视频下载</span>
              <t-tag theme="primary" size="small" style="margin-left: 8px">{{ item.video.filter((v) => v.videoUrl).length }}</t-tag>
            </div>
            <div class="headRight">
              <t-checkbox v-model="selectAll" :indeterminate="isIndeterminate" @change="handleSelectAll">全选</t-checkbox>
              <t-button
                theme="primary"
                :disabled="selectedVideos.length === 0 || isDownloading"
                :loading="isDownloading"
                @click="downloadSelectedVideos">
                <template #icon><i-to-bottom theme="outline" size="18" /></template>
                {{ isDownloading ? `打包中 ${downloadProgress}%` : `下载选中 (${selectedVideos.length})` }}
              </t-button>
            </div>
          </div>
          <div class="data">
            <div v-if="item.video.filter((v) => v.videoUrl).length === 0" class="emptyState">
              <t-icon name="video" size="64px" style="color: #dcdcdc" />
              <p>暂无可下载的视频</p>
            </div>
            <div v-else class="downloadGrid">
              <div
                v-for="(videoItem, videoIndex) in item.video.filter((v) => v.videoUrl)"
                :key="videoIndex"
                class="downloadItem"
                :class="{ selected: selectedVideos.includes(videoItem.videoUrl) }"
                @click="toggleSelectVideo(videoItem.videoUrl)">
                <div class="selectOverlay" @click.stop>
                  <t-checkbox :checked="selectedVideos.includes(videoItem.videoUrl)" @change="toggleSelectVideo(videoItem.videoUrl)" />
                </div>
                <div class="videoCover">
                  <video
                    :ref="(el) => setDownloadVideoRef(el, videoItem.videoUrl)"
                    :src="videoItem.videoUrl"
                    class="videoElement"
                    controls
                    preload="metadata"
                    @click.stop></video>
                </div>
              </div>
            </div>
          </div>
        </div>
      </t-tab-panel>
    </t-tabs>
    <editStoryboard v-model="editStoryboardShow" :storyboardForm="storyboardForm" />
    <addVideoDeploy v-model="addVideoDeployShow" :modelList="modelList" />
    <editVideo v-model="editVideoShow" :videoForm="videoForm" :modelList="modelList" @select="onVideoSelect" />
  </div>
</template>

<script setup lang="ts">
import editStoryboard from "./components/editStoryboard.vue";
import addVideoDeploy from "./components/addVideoDeploy.vue";
import editVideo from "./components/editVideo.vue";
import JSZip from "jszip";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());

//视频模型列表类型
interface ModelItem {
  manufacturer: string;
  model: string;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
  aspectRatio: string[];
  type: string[];
  audio: boolean;
}

//集标题
const setData = ref("0");
//集内容
const setContent = ref([
  {
    title: "第一集",
    storyboard: [
      {
        prompt: "这个是一个提示词1阿瑟地方撒放到水电费水电费水电费水电费水电费水电费水电撒旦法士大夫水电费水电费水电费费水电费",
        imageUrl: "https://tdesign.gtimg.com/demo/demo-image-1.png",
      },
      {
        prompt: "这个是一个提示词2",
        imageUrl: "https://tdesign.gtimg.com/demo/demo-image-1.png",
      },
      {
        prompt: "这个是一个提示词2",
        imageUrl: "https://tdesign.gtimg.com/demo/demo-image-1.png",
      },
      {
        prompt: "这个是一个提示词2",
        imageUrl: "https://tdesign.gtimg.com/demo/demo-image-1.png",
      },
    ],
    video: [
      {
        model: "doubao-seedance-1-5-pro-251215",
        mode: "endFrameOptional",
        images: [""],
        resolution: "1920x1080",
        aspectRatio: "16:9",
        duration: 5,
        prompt: "",
        videoUrl: "//v2.cri.cn/M00/02/C3/rBABDmblg6eADAXKBZHO91F1HZ0889.mp4",
        generateUrl: [
          "http://202508W24.ban.tools.codebook.ltd/js/player/CodeBookCore.html?url=https%3A%2F%2Fwww.lingyuzhao.top%2Fb%2Fshare%2Fdownload2%2FnoLogin%2Fshare%2F17c8d054513ae15059080dd0725df371c9145569eb1cb0a84c036d4cdd9acea5.mp4",
          "http://202508W24.ban.tools.codebook.ltd/js/player/CodeBookCore.html?url=https%3A%2F%2Fwww.lingyuzhao.top%2Fb%2Fshare%2Fdownload2%2FnoLogin%2Fshare%2F17c8d054513ae15059080dd0725df371c9145569eb1cb0a84c036d4cdea5.mp4",
        ],
      },
      {
        model: "doubao-seedance-1-0-lite-i2v-250428",
        mode: "endFrameOptional",
        images: [""],
        resolution: "1920x1080",
        aspectRatio: "16:9",
        duration: 5,
        prompt: "",
        videoUrl: "https://cms-emer-res.cctvnews.cctv.com/cctv/video/20240502/7d889b4dce894c60b26a96e3e9c6ee51_H264_3000K_MP4/20240502230635275.m3u8",
        generateUrl: [
          "http://202508W24.ban.tools.codebook.ltd/js/player/CodeBookCore.html?url=https%3A%2F%2Fwww.lingyuzhao.top%2Fb%2Fshare%2Fdownload2%2FnoLogin%2Fshare%2F17c8d054513ae15059080dd0725df371c9145569eb1cb0a84c036d4cdd9acea5.mp4",
        ],
      },
      {
        model: "doubao-seedance-1-5-pro-251215",
        mode: "endFrameOptional",
        images: [],
        resolution: "1920x1080",
        aspectRatio: "16:9",
        duration: 5,
        prompt: "",
        videoUrl: "",
        generateUrl: [],
      },
    ],
  },
  {
    title: "第二集",
    storyboard: [],
    video: [],
  },
]);
onMounted(() => {
  getModelList();
});
//视频模型列表
const modelList = ref<ModelItem[]>([]);
//获取视频模型列表
function getModelList() {
  modelList.value = [
    // doubao-seedance-1-5-pro 文生视频/图生视频
    {
      manufacturer: "volcengine",
      model: "doubao-seedance-1-5-pro-251215",
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
      aspectRatio: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
      type: ["text", "endFrameOptional"],
      audio: true,
    },
    // doubao-seedance-1-0-pro 文生视频/图生视频
    {
      manufacturer: "volcengine",
      model: "doubao-seedance-1-0-pro-250528",
      durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
      aspectRatio: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
      type: ["text", "endFrameOptional"],
      audio: false,
    },
    // doubao-seedance-1-0-pro-fast 文生视频/图生视频
    {
      manufacturer: "volcengine",
      model: "doubao-seedance-1-0-pro-fast-251015",
      durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
      aspectRatio: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
      type: ["text", "singleImage"],
      audio: false,
    },
    // doubao-seedance-1-0-lite-i2v 图生视频（仅支持图片模式）
    {
      manufacturer: "volcengine",
      model: "doubao-seedance-1-0-lite-i2v-250428",
      durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
      aspectRatio: [],
      type: ["endFrameOptional", "reference"],
      audio: false,
    },
  ];
}

const storyboardForm = ref<{ prompt: string; imageUrl: string }>();
const editStoryboardShow = ref(false);
//编辑分镜
function storyboardFn(item: { prompt: string; imageUrl: string }) {
  storyboardForm.value = {
    ...item,
  };
  editStoryboardShow.value = true;
}
//删除分镜
function delStoryboard() {}
//添加视频配置
const addVideoDeployShow = ref(false);

//编辑视频
interface VideoItem {
  model: string;
  mode: string;
  images: string[];
  resolution: string;
  aspectRatio?: string;
  duration: number;
  prompt: string;
  videoUrl: string;
  generateUrl: string[];
}
const editVideoShow = ref(false);
const videoForm = ref<VideoItem>();
// 当前编辑的视频索引
const currentVideoIndex = ref<number>(-1);

function editVideoFn(item: VideoItem, index: number) {
  videoForm.value = {
    ...item,
  };
  currentVideoIndex.value = index;
  editVideoShow.value = true;
}

// 视频选择回调，更新videoUrl
function onVideoSelect(videoUrl: string) {
  const setIndex = parseInt(setData.value);
  if (currentVideoIndex.value >= 0 && setContent.value[setIndex]?.video[currentVideoIndex.value]) {
    setContent.value[setIndex].video[currentVideoIndex.value].videoUrl = videoUrl;
  }
}

//删除视频配置
function delVideo() {}

// 已选中的视频URL列表
const selectedVideos = ref<string[]>([]);

// 全选状态
const selectAll = ref(false);

// 半选状态（部分选中）
const isIndeterminate = computed(() => {
  const setIndex = parseInt(setData.value);
  const availableVideos = setContent.value[setIndex]?.video.filter((v) => v.videoUrl) || [];
  const selectedCount = selectedVideos.value.length;
  return selectedCount > 0 && selectedCount < availableVideos.length;
});

// 监听当前集切换，清空选择
watch(setData, () => {
  selectedVideos.value = [];
  selectAll.value = false;
});

// 处理全选/取消全选
function handleSelectAll(checked: boolean) {
  const setIndex = parseInt(setData.value);
  const availableVideos = setContent.value[setIndex]?.video.filter((v) => v.videoUrl) || [];
  if (checked) {
    selectedVideos.value = availableVideos.map((v) => v.videoUrl);
  } else {
    selectedVideos.value = [];
  }
}

// 切换单个视频选中状态
function toggleSelectVideo(videoUrl: string) {
  const index = selectedVideos.value.indexOf(videoUrl);
  if (index > -1) {
    selectedVideos.value.splice(index, 1);
  } else {
    selectedVideos.value.push(videoUrl);
  }
  // 更新全选状态
  const setIndex = parseInt(setData.value);
  const availableVideos = setContent.value[setIndex]?.video.filter((v) => v.videoUrl) || [];
  selectAll.value = selectedVideos.value.length === availableVideos.length && availableVideos.length > 0;
}

// 下载状态
const isDownloading = ref(false);
const downloadProgress = ref(0);

// 下载选中的视频到压缩包
async function downloadSelectedVideos() {
  if (selectedVideos.value.length === 0) return;
  isDownloading.value = true;
  downloadProgress.value = 0;
  try {
    const zip = new JSZip();
    const total = selectedVideos.value.length;
    for (let i = 0; i < selectedVideos.value.length; i++) {
      const videoUrl = selectedVideos.value[i];
      try {
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        // 从URL提取文件名或使用序号命名
        const fileName = `video_${i + 1}.mp4`;
        zip.file(fileName, blob);
        downloadProgress.value = Math.round(((i + 1) / total) * 100);
      } catch (error) {
        console.error(`下载视频失败: ${videoUrl}`, error);
      }
    }
    // 生成压缩包并下载
    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.value?.name || "视频"}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("打包下载失败:", error);
  } finally {
    isDownloading.value = false;
    downloadProgress.value = 0;
  }
}

// 播放视频
const downloadVideoRefs = ref<Record<string, HTMLVideoElement | null>>({});
function setDownloadVideoRef(el: Element | ComponentPublicInstance | null, url: string) {
  if (el && el instanceof HTMLVideoElement) {
    downloadVideoRefs.value[url] = el;
  }
}
</script>

<style lang="scss" scoped>
.production {
  .storyboard {
    margin-top: 20px;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

    .head {
      border-bottom: 1px solid #e7e7e7;
      height: 60px;
      padding: 0 20px;
      background: linear-gradient(to bottom, #fafafa, #fff);

      .headLeft {
        display: flex;
        align-items: center;

        .title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
      }
    }

    .data {
      padding: 20px;
      min-height: 300px;

      .emptyState {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        color: #9ca3af;
        p {
          margin: 16px 0 24px;
          font-size: 14px;
        }
      }

      .storyboardGrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
        .storyboardItem {
          position: relative;
          background: #f3f4f6;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
          cursor: pointer;
          padding-top: 66.67%;

          &:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
            .deleteBtn {
              opacity: 1;
            }
          }

          .storyboardImage {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .itemBadge {
            position: absolute;
            top: 12px;
            left: 12px;
            z-index: 10;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            backdrop-filter: blur(8px);
          }

          .deleteBtn {
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 10;
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .promptInfo {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 16px 12px;
            background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4), transparent);
            z-index: 9;

            .promptText {
              font-size: 13px;
              line-height: 1.6;
              color: white;
              display: -webkit-box;
              -webkit-line-clamp: 1;
              -webkit-box-orient: vertical;
              overflow: hidden;
              text-overflow: ellipsis;
              word-break: break-all;
            }
          }
        }
      }
    }
  }

  .video {
    margin-top: 20px;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

    .head {
      border-bottom: 1px solid #e7e7e7;
      height: 60px;
      padding: 0 20px;
      background: linear-gradient(to bottom, #fafafa, #fff);

      .headLeft {
        display: flex;
        align-items: center;

        .title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
      }
    }

    .data {
      padding: 20px;
      min-height: 300px;
      .emptyState {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        color: #9ca3af;
      }

      .videoGrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
        .videoItem {
          position: relative;
          background: #f3f4f6;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
          cursor: pointer;
          &:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
            .deleteBtn {
              opacity: 1;
            }
          }
          .videoCover {
            position: relative;
            width: 100%;
            padding-top: 60%;
            .videoImage {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .playIcon {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: rgba(255, 255, 255, 0.9);
              border-radius: 50%;
              transition: transform 0.3s ease;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .pendingState {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: #dddbdb;
              color: #000;
              span {
                margin-top: 8px;
                font-size: 14px;
                font-weight: 500;
              }
            }
          }

          .itemBadge {
            position: absolute;
            top: 12px;
            left: 12px;
            z-index: 10;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            backdrop-filter: blur(8px);
          }

          .deleteBtn {
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 10;
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .videoInfo {
            padding: 12px;
            background: #fff;

            .infoRow {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              margin-bottom: 8px;
            }

            .promptText {
              font-size: 13px;
              line-height: 1.5;
              color: #6b7280;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }
        }
      }
    }
  }
  .download {
    margin-top: 20px;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

    .head {
      border-bottom: 1px solid #e7e7e7;
      height: 60px;
      padding: 0 20px;
      background: linear-gradient(to bottom, #fafafa, #fff);

      .headLeft {
        display: flex;
        align-items: center;

        .title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
      }

      .headRight {
        display: flex;
        align-items: center;
        gap: 16px;
      }
    }

    .data {
      padding: 20px;
      min-height: 300px;

      .emptyState {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        color: #9ca3af;

        p {
          margin: 16px 0 0;
          font-size: 14px;
        }
      }

      .downloadGrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
        .downloadItem {
          position: relative;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
          cursor: pointer;
          &:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
          }

          .selectOverlay {
            position: absolute;
            top: 10px;
            right: 5px;
            z-index: 15;
            border-radius: 4px;
          }

          .videoCover {
            width: 100%;
            .videoElement {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
          }
        }
      }
    }
  }
}
</style>
