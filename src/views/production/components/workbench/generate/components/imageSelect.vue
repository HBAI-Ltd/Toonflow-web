<template>
  <div class="imageUploadBox ac">
    <!-- 单图模式 -->
    <template v-if="mode == 'singleImage' || Array.isArray(parseMode(mode as string))">
      <div class="uploadBtn c fc" v-for="(item, index) in imageList" :key="index">
        <template v-if="item.src">
          <img class="uploadPreview" :src="item.src" />
        </template>
        <template v-else>
          <span style="font-size: 20px">文</span>
        </template>
        <div class="clearBtn" @click="splitImage(index)">
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
        <div v-if="imageList?.[index] && imageList?.[index].id" style="flex: 1">
          <template v-if="imageList?.[index].src">
            <img class="uploadPreview" :src="imageList?.[index].src" />
          </template>
          <template v-else>
            <span style="font-size: 20px">文</span>
          </template>
          <div class="clearBtn" @click.stop="imageList[index] = { id: null } as any">
            <i-close size="12" />
          </div>
          <div class="source">
            <t-tag size="small">
              {{ imageList?.[index].sources == "storyboard" ? $t("workbench.generate.storyboard") : $t("workbench.generate.assets") }}
            </t-tag>
          </div>
        </div>
        <template v-else>
          <i-plus size="24"></i-plus>
          {{ item.label }}
        </template>
      </div>
    </template>
    <div class="uploadBtn c fc" v-if="isShowAddImage" @click="handleMixedAdd()">
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
          <img v-if="sb.src" :src="sb.src" />
          <div v-else class="textBox ac jc">
            <span style="font-size: 20px">文</span>
          </div>
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
  const startOptional = props.mode === "startFrameOptional";
  const endOptional = props.mode === "endFrameOptional";
  return [
    { label: startOptional ? "首帧(可选)" : "首帧", value: "start" },
    { label: endOptional ? "尾帧(可选)" : "尾帧", value: "end" },
  ];
});
/** 解析模式值（字符串或 JSON 数组） */
function parseMode(value: string): VideoMode | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as ReferenceType[];
  } catch {
    return value as Exclude<VideoMode, ReferenceType[]>;
  }
  return value as Exclude<VideoMode, ReferenceType[]>;
}

//判断是否显示添加参考图
const isShowAddImage = computed(() => {
  const mode = props.mode;
  if (mode == "singleImage" && imageList.value.length >= 1) {
    return false;
  }
  if (mode == "endFrameOptional" || mode == "startEndRequired" || mode == "startFrameOptional") {
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
let currentLocal = "";
function handleMixedAdd(local: string = "") {
  currentLocal = local ?? "";

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
      if (local) {
        if (imageList.value.length >= 2) {
          const index = local == "start" ? 0 : 1;

          imageList.value[index] = newItems[0];
        } else if (imageList.value.length == 1) {
          if (local == "start") {
            imageList.value.unshift(newItems[0]);
          } else {
            imageList.value.push(newItems[0]);
          }
        } else {
          if (local == "start") {
            imageList.value.unshift(newItems[0]);
          } else {
            imageList.value.push(...[{ id: "" } as any, newItems[0]]);
          }
        }
      } else {
        imageList.value.push(...newItems);
      }
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
  const newItem = {
    fileType,
    sources: "storyboard",
    src: sb.src,
    id: sb.id,
    prompt: sb.prompt ?? undefined,
    index: sb.index,
  } as UploadItem;

  if (currentLocal) {
    if (imageList.value.length >= 2) {
      const index = currentLocal == "start" ? 0 : 1;

      imageList.value[index] = newItem;
    } else if (imageList.value.length == 1) {
      if (currentLocal == "start") {
        imageList.value.unshift(newItem);
      } else {
        imageList.value.push(newItem);
      }
    } else {
      if (currentLocal == "start") {
        imageList.value.unshift(newItem);
      } else {
        imageList.value.push(...[{ id: "" } as any, newItem]);
      }
    }
  } else {
    imageList.value.push(newItem);
  }
}
function splitImage(index: number) {
  imageList.value.splice(index, 1);
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
  .storyboardGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    max-height: 60vh;
    overflow-y: auto;
    padding: 4px;
    .storyboardItem {
      cursor: pointer;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid transparent;
      transition:
        border-color 0.2s,
        box-shadow 0.2s;
      &:hover {
        border-color: var(--td-brand-color);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      }
      img {
        width: 100%;
        aspect-ratio: 16/9;
        object-fit: cover;
        display: block;
      }
      .textBox {
        aspect-ratio: 16/9;
        width: 100%;
        text-align: center;
        border: 1px solid #ccc;
      }
    }
  }
}
</style>
