<template>
  <div class="imageUploadBox ac">
    <!-- 单图模式 -->
    <template v-if="mode == 'singleImage'">
      <div class="uploadBtn c fc" v-for="item in imageList" :key="item.id">
        <template v-if="item.src">
          <img class="uploadPreview" :src="item.src" />
        </template>
        <template v-else>
          <span style="font-size: 20px">文</span>
        </template>
        <div class="clearBtn" @click="imageList = []">
          <i-close size="12" />
        </div>
        <div class="source">
          <t-tag size="small">
            {{ item.sources == "storyboard" ? $t("workbench.generate.storyboard") : $t("workbench.generate.assets") }}
          </t-tag>
        </div>
      </div>
    </template>
    <template v-else-if="mode == 'endFrameOptional' || mode == 'startFrameOptional' || mode == 'startEndRequired'">
      <div class="uploadBtn c fc" v-for="(item, index) in buildLable" :key="index" @click="handleMixedAdd(item.value)">
        <div v-if="imageList?.[index] && imageList?.[index].id">
          <template v-if="imageList?.[index].src">
            <img class="uploadPreview" :src="imageList?.[index].src" />
          </template>
          <template v-else>
            <span style="font-size: 20px">文</span>
          </template>
          <div class="clearBtn">
            <i-close size="12" />
          </div>
          <div class="source">
            <t-tag size="small">
              {{ imageList?.[index].sources == "storyboard" ? $t("workbench.generate.storyboard") : $t("workbench.generate.assets") }}
            </t-tag>
          </div>
        </div>

        <i-plus size="24"></i-plus>
        {{ item.label }}
      </div>
    </template>
    <template v-else-if="Array.isArray(mode)">
      <div class="uploadBtn c fc" v-for="item in imageList" :key="item.id">
        <template v-if="item.src">
          <img class="uploadPreview" :src="item.src" />
        </template>
        <template v-else>
          <span style="font-size: 20px">文</span>
        </template>
        <div class="clearBtn" @click="imageList = []">
          <i-close size="12" />
        </div>
        <div class="source">
          <t-tag size="small">
            {{ item.sources == "storyboard" ? $t("workbench.generate.storyboard") : $t("workbench.generate.assets") }}
          </t-tag>
        </div>
      </div>
    </template>
    <div class="uploadBtn c fc" v-if="isShowAddImage" @click="handleMixedAdd">
      <i-plus size="24"></i-plus>
      {{ $t("workbench.generate.addReference") }}
    </div>

    <!-- 分镜选择弹窗 -->
    <t-dialog
      v-model:visible="storyboardDialogVisible"
      :header="$t('workbench.generate.selectStoryboard')"
      :footer="false"
      width="800px"
      placement="center">
      <div class="storyboardGrid">
        <div class="storyboardItem" v-for="sb in storyboardList" :key="sb.id" @click="pickStoryboard(sb)">
          <img :src="sb.src" />
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import "@/views/production/components/workbench/type/type";
import assetsCheck, { type AssetType, type ClipMediaType } from "@/utils/assetsCheck";

const props = defineProps<{
  mode: VideoMode;
  storyboardList: StoryboardItem[];
}>();
const imageList = defineModel<UploadItem[]>({
  default: () => [],
});
//分镜选择弹窗
const storyboardDialogVisible = ref(false);

const buildLable = computed(() => {
  if (props.mode == "startEndRequired") {
    return [
      {
        label: "首帧",
        value: "start",
      },
      {
        label: "尾帧",
        value: "end",
      },
    ];
  }
  if (props.mode == "endFrameOptional") {
    return [
      {
        label: "首帧",
        value: "start",
      },
      {
        label: "尾帧(可选)",
        value: "end",
      },
    ];
  }
  if (props.mode == "startFrameOptional") {
    return [
      {
        label: "首帧(可选)",
        value: "start",
      },
      {
        label: "尾帧",
        value: "end",
      },
    ];
  }
});

//判断是否显示添加参考图
const isShowAddImage = computed(() => {
  const mode = props.mode;
  if (mode == "singleImage" && imageList.value.length >= 1) {
    return false;
  }
  if ((mode == "endFrameOptional" || mode == "startEndRequired" || mode == "startFrameOptional") && imageList.value.length >= 2) {
    return false;
  }
  if (mode == "text") return false;
  //多参模式默认 true
  return true;
});

/** 根据文件扩展名推断媒体类型 */
function getFileTypeByExt(src: string | undefined): "image" | "video" | "audio" {
  const ext = src?.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
  return "image";
}
/** 根据混合模式推导当前允许的 clip 媒体类型 */
const mixedClipMediaTypes = computed<ClipMediaType[]>(() => {
  const mode = props.mode;
  if (!Array.isArray(mode)) return [];
  const map: Record<string, ClipMediaType> = { audioReference: "audio", imageReference: "image", videoReference: "video" };
  return mode.filter((m) => m in map).map((m) => map[m]);
});
function handleMixedAdd(label?: string) {
  const multiple = Array.isArray(props.mode);
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.selectSource"),
    confirmBtn: $t("workbench.generate.confirm"),
    cancelBtn: $t("workbench.generate.cancel"),
    onConfirm: async () => {
      dlg.destroy();
      const assets = await assetsCheck({ types: ["role", "tool", "scene", "clip"], clipMediaTypes: mixedClipMediaTypes.value, multiple });
      if (!assets.length) return;

      const newItems: UploadItem[] = assets.map((asset) => {
        const fileType = getFileTypeByExt(asset.src);
        return {
          fileType,
          sources: "assets",
          src: asset.src,
          id: asset.id,
          prompt: asset.prompt,
        };
      });
      imageList.value.push(...newItems);
    },
    onCancel: () => {
      dlg.destroy();
      storyboardDialogVisible.value = true;
    },
  });
}

/** 分镜弹窗选中回调 */
function pickStoryboard(sb: StoryboardItem) {
  storyboardDialogVisible.value = false;
  const fileType = "image";
  imageList.value.push({
    fileType,
    sources: "storyboard",
    src: sb.src,
    id: sb.id,
    prompt: sb.prompt ?? undefined,
    index: sb.index,
  });
}
</script>

<style lang="scss" scoped>
.imageUploadBox {
  gap: 8px;
  .uploadBtn {
    width: 80px;
    height: 80px;
    position: relative;
    border: 1px dashed var(--td-component-border);
    border-radius: 8px;
    &:hover {
      border-color: var(--td-text-color);
      cursor: pointer;
    }
    .uploadPreview {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 8px;
    }
    .clearBtn {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      &:hover {
        background: rgba(0, 0, 0, 0.85);
      }
    }
    &:hover .clearBtn {
      display: flex;
    }
    .source {
      position: absolute;
      bottom: 2px;
      right: 2px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      &:hover {
        background: rgba(0, 0, 0, 0.85);
      }
    }
    &:hover .source {
      display: flex;
    }
  }
}
</style>
