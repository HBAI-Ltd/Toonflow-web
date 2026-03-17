<template>
  <div class="assetsData">
    <t-dialog
      v-model:visible="assetsDataShow"
      header="资产数据"
      top="3vh"
      attach="body"
      width="80vw"
      :maskClosable="false"
      wrapClassName="no-header-margin"
      dialogClass="custom-modal"
      :footer="true"
      @close-btn-click="handleCancel"
      @confirm="onConfirm"
      @cancel="handleCancel">
      <div class="data">
        <t-tabs v-model="assetOptions" @change="selectAssetOptions">
          <t-tab-panel v-for="(item, index) in themeData" :key="index" :value="item.value">
            <template #label>
              <div class="tabLabel">
                <component :is="item.icon" theme="outline" size="20" />
                <span>{{ item.name }}</span>
              </div>
            </template>
            <div class="table">
              <t-table
                :columns="columns"
                :data="tableData"
                :selected-row-keys="selectedRowKeys"
                :expanded-row-keys="expandedRowKeys"
                row-key="id"
                hover
                stripe
                size="small"
                :pagination="pagination"
                :loading="loading"
                lazy-load
                table-layout="fixed"
                @select-change="handleSelectChange"
                @expand-change="handleExpandChange"
                @page-change="handlePageChange">
                <template #preview="{ row }">
                  <div class="previewCell">
                    <t-image-viewer :images="[row.filePath]" :closeOnEscKeydown="true" :closeOnOverlay="true">
                      <template #trigger="{ open }">
                        <div class="imageTrigger" @click="row.filePath && open()">
                          <img v-if="row.filePath" :src="row.filePath" :alt="row.name" class="previewImage" />
                          <div v-else class="noImage">
                            <t-icon name="image" size="24px" />
                          </div>
                          <div v-if="row.filePath" class="imageHoverOverlay">
                            <t-icon name="browse" size="20px" />
                            <span class="hoverText">预览</span>
                          </div>
                        </div>
                      </template>
                    </t-image-viewer>
                  </div>
                </template>
              </t-table>
            </div>
          </t-tab-panel>
        </t-tabs>
      </div>
      <template #footer>
        <t-space>
          <t-button theme="default" @click="handleCancel">取消</t-button>
          <t-button theme="primary" @click="onConfirm" :disabled="selectedRowKeys.length === 0">选中</t-button>
        </t-space>
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import type { TabValue, TableProps } from "tdesign-vue-next";
const assetsDataShow = defineModel({ type: Boolean, default: false });
const assetOptions = ref<TabValue>("role");
const themeData = ref([
  {
    name: "角色",
    value: "role",
    icon: "i-permissions",
  },
  {
    name: "道具",
    value: "tool",
    icon: "i-tool",
  },
  {
    name: "场景",
    value: "scene",
    icon: "i-landscape",
  },
]);
const activeTab = ref("角色");
function selectAssetOptions(value: TabValue) {
  assetOptions.value = value;
  if (value === "role") {
    activeTab.value = "角色";
  } else if (value === "tool") {
    activeTab.value = "道具";
  } else if (value === "scene") {
    activeTab.value = "场景";
  }
  loadCurrentTabData();
}
// 加载当前标签的数据
async function loadCurrentTabData() {
  let type = "";
  if (assetOptions.value === "role") {
    type = "角色";
  } else if (assetOptions.value === "tool") {
    type = "道具";
  } else if (assetOptions.value === "scene") {
    type = "场景";
  }
  await getFilteredData(type);
}
function getFilteredData(type: string) {}
const columns: TableProps["columns"] = [
  { colKey: "row-select", type: "single", width: 50, align: "center", fixed: "left" },
  {
    colKey: "filePath",
    title: "预览",
    width: 120,
    align: "center",
    cell: "preview",
  },
  {
    colKey: "name",
    title: "名称",
    width: 100,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "prompt",
    title: "提示词",
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "describe",
    title: "描述",
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "remark",
    title: "备注",
    minWidth: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "startTime",
    title: "创建时间",
    width: 200,
    align: "center",
    cell: "startTime",
  },
];
const tableData = ref([
  {
    id: 1,
    filePath: "https://tdesign.gtimg.com/demo/demo-image-1.png",
    name: "角色1",
    prompt: "提示词1",
    describe: "描述1",
    remark: "备注1",
    startTime: "2024-01-01 10:00:00",
  },
  {
    id: 2,
    filePath: "https://tdesign.gtimg.com/demo/demo-image-1.png",
    name: "角色2",
    prompt: "提示词2",
    describe: "描述2",
    remark: "备注2",
    startTime: "2024-01-02 11:00:00",
  },
]);
const selectedRowKeys = ref<Array<string | number>>([]);
const expandedRowKeys = ref<Array<string | number>>([]);
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
});
const loading = ref(false);
// 选择行（单选，每次只能选中一个）
function handleSelectChange(value: Array<string | number>) {
  selectedRowKeys.value = value.length > 0 ? [value[value.length - 1]] : [];
}
function handleExpandChange(value: Array<string | number>) {
  if (value.length > 3) {
    value = value.slice(-3);
  }
  expandedRowKeys.value = value;
}

// 处理分页变化
function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.value.current = pageInfo.current;
  pagination.value.pageSize = pageInfo.pageSize;
  loadCurrentTabData();
}
const searchText = ref("");
function closeModal(): void {
  selectedRowKeys.value = [];
  searchText.value = "";
}
const emit = defineEmits(["confirmSelection"]);
async function onConfirm() {
  if (selectedRowKeys.value.length === 0) {
    MessagePlugin.warning("请选择一个资产");
    return;
  }
  const selectedAsset = tableData.value.find((item) => item.id === selectedRowKeys.value[0]);
  if (!selectedAsset) {
    MessagePlugin.error("请选择要保存的项目");
    return;
  }
  emit("confirmSelection", selectedAsset);
  assetsDataShow.value = false;
  closeModal();
}
function handleCancel() {
  closeModal();
}
</script>

<style lang="scss" scoped>
.data {
  .tabLabel {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }
  .table {
    .previewCell {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 4px 0;
      .imageTrigger {
        position: relative;
        width: 72px;
        height: 72px;
        border-radius: 6px;
        overflow: hidden;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
        &:hover {
          transform: scale(1.04);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          .imageHoverOverlay {
            opacity: 1;
          }
        }
        .previewImage {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .noImage {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background-color: var(--td-gray-color-2);
          color: var(--td-gray-color-7);
        }
        .imageHoverOverlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s ease;
          color: #fff;
          .hoverText {
            font-size: 12px;
            line-height: 1;
          }
        }
      }
    }
  }
}
</style>
