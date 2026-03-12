<template>
  <div class="storyboardList">
    <t-dialog
      v-model:visible="storyboardListShow"
      header="分镜列表"
      width="85%"
      top="2vh"
      placement="center"
      :footer="false"
      class="videoDeployDialog"
      @closed="resetData">
      <div class="tableHeader">
        <div class="statistics">
          <span class="totalCount">
            总数量:
            <strong>{{ storyboardList.length }}</strong>
          </span>
          <span class="selectedCount">
            已选择:
            <strong>{{ selectedRowKeys.length }}</strong>
          </span>
        </div>
        <div class="batchActions">
          <t-button theme="default" variant="outline" v-if="props.state == true" :disabled="selectedRowKeys.length === 0" @click="handleBatchUpscale">
            <template #icon><t-icon name="zoom-in" /></template>
            批量超分图片
          </t-button>
          <t-button theme="primary" v-if="props.state == true" :disabled="selectedRowKeys.length === 0" @click="handleBatchGenerateVideoPrompt">
            <template #icon><t-icon name="edit-1" /></template>
            批量生成视频提示词
          </t-button>
          <t-button theme="primary" v-if="props.state == false" :disabled="selectedRowKeys.length !== 1" @click="exportImage">
            <template #icon><t-icon name="export" /></template>
            选择图片
          </t-button>
        </div>
      </div>
      <div class="data">
        <t-table
          :data="storyboardList"
          :columns="columns"
          row-key="id"
          hover
          stripe
          max-height="65vh"
          :selected-row-keys="selectedRowKeys"
          @select-change="handleSelectChange"
          :empty="'暂无分镜数据'">
          <template #index="{ rowIndex }">
            <span class="indexCell">{{ rowIndex + 1 }}</span>
          </template>
          <template #lensImage="{ row }">
            <div class="previewCell">
              <t-image-viewer :images="[row.lensImage]" :closeOnEscKeydown="true" :closeOnOverlay="true">
                <template #trigger="{ open }">
                  <div class="imageTrigger" @click="row.lensImage && open()">
                    <img v-if="row.lensImage" :src="row.lensImage" alt="镜头图片" class="previewImage" />
                    <div v-else class="noImage">
                      <t-icon name="image" size="24px" />
                    </div>
                    <div v-if="row.lensImage" class="imageHoverOverlay">
                      <t-icon name="browse" size="20px" />
                      <span class="hoverText">预览</span>
                    </div>
                  </div>
                </template>
              </t-image-viewer>
              <t-tag :theme="row.superScore ? 'primary' : 'default'" class="superScoreTag">
                {{ row.superScore ? "已超分" : "未超分" }}
              </t-tag>
            </div>
          </template>
          <template #imagePrompt="{ row }">
            <t-tooltip :content="row.imagePrompt" placement="top" :show-arrow="true">
              <div class="promptCell">{{ row.imagePrompt }}</div>
            </t-tooltip>
          </template>
          <template #videoPrompt="{ row }">
            <t-tooltip :content="row.videoPrompt" placement="top" :show-arrow="true">
              <div class="promptCell">{{ row.videoPrompt }}</div>
            </t-tooltip>
          </template>
          <template #duration="{ row }">
            <t-tag theme="primary" variant="light">{{ row.duration }}</t-tag>
          </template>
        </t-table>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const storyboardListShow = defineModel<boolean>({
  type: Boolean,
  default: false,
});
const props = defineProps<{
  state?: boolean;
}>();

const storyboardList = ref<Storyboard[]>([
  {
    id: 1,
    lensImage: "https://tdesign.gtimg.com/demo/demo-image-1.png",
    imagePrompt: "一个美丽的日落",
    superScore: false,
    videoPrompt: "日落时分，天空被染成橙色，云彩像棉花糖一样漂浮",
    duration: "5s",
  },
  {
    id: 2,
    lensImage: "https://tdesign.gtimg.com/demo/demo-image-1.png",
    imagePrompt: "一只可爱的猫咪",
    superScore: true,
    videoPrompt: "猫咪在阳光下打滚，毛发闪闪发光，眼睛充满好奇",
    duration: "3s",
  },
]);

// 类型
interface Storyboard {
  id: number;
  lensImage: string; // 镜头图片URL
  imagePrompt: string; // 图片提示词
  videoPrompt: string; // 视频提示词
  duration: string; // 时长
  superScore: boolean; // 是否超分
}

// 选中的行
const selectedRowKeys = ref<(string | number)[]>([]);

// 表格列配置
const columns = [
  { colKey: "row-select", type: "multiple" as const, width: 50 },
  { colKey: "index", title: "序号", width: 70, align: "center" as const },
  { colKey: "lensImage", title: "镜头图片", width: 140, align: "center" as const },
  { colKey: "imagePrompt", title: "图片提示词", ellipsis: true },
  { colKey: "videoPrompt", title: "视频提示词", ellipsis: true },
  { colKey: "duration", title: "时长", width: 100, align: "center" as const },
];

// 选择变化
function handleSelectChange(value: (string | number)[]) {
  selectedRowKeys.value = value;
}

// 批量超分图片
function handleBatchUpscale() {
  const selectedItems = storyboardList.value.filter((item) => selectedRowKeys.value.includes(item.id));
  console.log("批量超分图片", selectedItems);
}

// 批量生成视频提示词
function handleBatchGenerateVideoPrompt() {
  const selectedItems = storyboardList.value.filter((item) => selectedRowKeys.value.includes(item.id));
  console.log("批量生成视频提示词", selectedItems);
}
const emit = defineEmits(["exportImage"]);
//确认选择
function exportImage() {
  if (selectedRowKeys.value.length === 0) return;
  const firstSelectedId = selectedRowKeys.value[0];
  const selectedItem = storyboardList.value.find((item) => item.id === firstSelectedId);
  if (selectedItem) {
    emit("exportImage", selectedItem);
    storyboardListShow.value = false;
  }
}

function resetData() {
  selectedRowKeys.value = [];
  storyboardListShow.value = false;
}
</script>

<style lang="scss" scoped>
.storyboardList {
  .tableHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding: 12px 16px;
    border-radius: 6px;

    .statistics {
      display: flex;
      align-items: center;
      gap: 24px;

      .totalCount,
      .selectedCount {
        font-size: 14px;
        strong {
          font-weight: 600;
          margin-left: 4px;
        }
      }
    }

    .batchActions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }

  .data {
    .indexCell {
      font-weight: 500;
    }
    .previewCell {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 8px 0;
      gap: 6px;

      .superScoreTag {
        margin-top: 4px;
      }

      .imageTrigger {
        position: relative;
        width: 100px;
        height: 60px;
        border-radius: 6px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          .imageHoverOverlay {
            opacity: 1;
          }
        }

        .previewImage {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .noImage {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .imageHoverOverlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.3s ease;
          color: #fff;

          .hoverText {
            font-size: 12px;
          }
        }
      }
    }

    .promptCell {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.5;
      max-height: 3em;
      word-break: break-all;
    }

    .operationCell {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 4px;
    }
  }
}
</style>
