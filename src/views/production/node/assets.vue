<template>
  <t-card class="assets">
    <Handle :id="props.handleIds.target" type="target" :position="Position.Top" />
    <div class="titleBar dragHandle">
      <div class="title">{{ $t("workbench.production.node.assets.title") }}</div>
    </div>
    <div class="content">
      <div class="cardGrid">
        <div v-for="asset in assets" :key="asset.id" class="assetItemBox">
          <t-card class="assetCard originalAssetCard">
            <div v-if="asset.src" class="assetImageWrap">
              <t-image :src="asset.src" fit="contain" class="assetImage" :preview="true">
                <template #overlayContent>
                  <div class="imageToolsWrap show">
                    <ImageTools :src="asset.src" position="br" />
                  </div>
                </template>
              </t-image>
            </div>
            <div v-else class="assetImageWrap assetImagePlaceholder">
              <t-loading v-if="asset.state == '生成中'" size="small" />
              <span v-else-if="asset.state == '生成失败'" style="color: red">{{ $t("workbench.production.node.assets.generateFailed") }}</span>
              <t-empty v-else size="small" :title="$t('workbench.production.node.assets.notGenerated')" />
            </div>
            <t-tooltip theme="primary" :content="$t('workbench.production.node.storyboard.deleteNode')">
              <div class="remove ac" @click.stop="removeAssetFn(asset.id!)">
                <i-delete theme="outline" size="18" fill="#fff" />
              </div>
            </t-tooltip>
            <div class="cardInfo">
              <div class="cardName">
                <span class="nameText">{{ asset.name }}</span>
                <t-tag theme="success">{{ $t("workbench.production.node.assets.originalAsset") }}</t-tag>
              </div>
              <div class="cardDesc">{{ asset.desc }}</div>
            </div>
          </t-card>
          <div class="divider">
            <i-right size="32"></i-right>
          </div>
          <div class="deriveAssets">
            <t-card v-for="(item, index) in asset.derive" :key="index" class="assetCard" @click="generateAssetsImage(item, asset.src)">
              <div v-if="item.src && item.state == '已完成'" class="assetImageWrap">
                <t-image :src="item.src" fit="contain" class="assetImage" :preview="true">
                  <template #overlayContent>
                    <div class="imageToolsWrap show">
                      <ImageTools :src="item.src" position="br">
                        <t-tooltip
                          theme="primary"
                          :content="item.libraryAssetId ? '该衍生资产已添加到资产库' : '添加到资产库后，其它剧本可以选择该资产'"
                          placement="bottom">
                          <t-button
                            size="small"
                            shape="square"
                            variant="outline"
                            :loading="addingLibraryIds.has(item.id)"
                            @click.stop="openAddToLibraryDialog(item)">
                            <template #icon>
                              <i-check v-if="item.libraryAssetId" size="16" />
                              <i-plus v-else size="16" />
                            </template>
                          </t-button>
                        </t-tooltip>
                      </ImageTools>
                    </div>
                  </template>
                </t-image>
              </div>
              <div v-else class="assetImageWrap assetImagePlaceholder">
                <t-loading v-if="item.state == '生成中'" size="small" />
                <t-tooltip v-else-if="item.state == '生成失败'" :content="item?.errorReason">
                  <div style="color: red; cursor: pointer">{{ $t("workbench.novel.genFailed") }}</div>
                </t-tooltip>
                <t-empty v-else size="small" :title="$t('workbench.production.node.assets.notGenerated')" />
              </div>
              <t-tooltip theme="primary" :content="$t('workbench.production.node.storyboard.deleteNode')">
                <div class="remove ac" @click.stop="removeFn(item.id!)">
                  <i-delete theme="outline" size="18" fill="#fff" />
                </div>
              </t-tooltip>
              <div class="cardInfo">
                <div class="cardName">
                  <span class="nameText">{{ item.name }}</span>
                  <t-tag theme="warning">{{ $t("workbench.production.node.assets.derived") }}</t-tag>
                </div>
                <div class="cardDesc">{{ item.desc }}</div>
              </div>
            </t-card>
            <t-card v-if="asset.derive.length <= 0" class="assetCard emptyCard">
              <t-empty :title="$t('workbench.production.node.assets.noDerivedAssets')"></t-empty>
            </t-card>
          </div>
        </div>
      </div>
    </div>
    <editImage v-model="visible" v-if="visible" :flowData="currentRow" @save="save" />
    <t-dialog
      v-model:visible="addLibraryVisible"
      header="添加到资产库"
      :confirm-btn="currentLibraryAsset?.libraryAssetId ? '再次添加' : '添加'"
      cancel-btn="取消"
      width="420px"
      @confirm="confirmAddToAssetLibrary">
      <div class="addLibraryForm">
        <div class="formLabel">资产名称</div>
        <t-input v-model="libraryAssetName" clearable placeholder="请输入资产名称" />
      </div>
    </t-dialog>
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position, type Edge } from "@vue-flow/core";
import editImage from "../components/editImage/index.vue";
import { type AssetItem, type DeriveAsset } from "../utils/flowBuilder";
import axios from "@/utils/axios";
import useProjectStore from "@/stores/project";
const { project } = storeToRefs(useProjectStore());
const props = defineProps<{
  id: string;
  handleIds: {
    target: string;
  };
}>();

const assets = defineModel<AssetItem[]>({ required: true });
const currentRow = ref<{
  flowId?: number;
  resultImages: { src: string; prompt: string }[];
  referanceImages: string[];
}>({
  resultImages: [],
  referanceImages: [],
});
const visible = ref(false);
const currentAssetsId = ref();
const addingLibraryIds = ref(new Set<number>());
const addLibraryVisible = ref(false);
const currentLibraryAsset = ref<DeriveAsset | null>(null);
const libraryAssetName = ref("");
function generateAssetsImage(row: DeriveAsset, referanceImageUrl: string) {
  currentRow.value = {
    flowId: row?.flowId,
    resultImages: [{ src: row.src, prompt: row.prompt }],
    referanceImages: [referanceImageUrl],
  };
  currentAssetsId.value = row.id;
  visible.value = true;
}

function showAddLibraryDialog(row: DeriveAsset) {
  currentLibraryAsset.value = row;
  libraryAssetName.value = row.name || "";
  addLibraryVisible.value = true;
}

function openAddToLibraryDialog(row: DeriveAsset) {
  if (addingLibraryIds.value.has(row.id)) return;
  if (!row.libraryAssetId) {
    showAddLibraryDialog(row);
    return;
  }
  const dialog = DialogPlugin.confirm({
    header: "再次添加资产",
    body: "该衍生资产已添加过资产库，是否再次添加一份新的资产？",
    confirmBtn: "再次添加",
    cancelBtn: "取消",
    theme: "warning",
    onConfirm: () => {
      dialog.destroy();
      showAddLibraryDialog(row);
    },
    onCancel: () => dialog.destroy(),
    onClose: () => dialog.destroy(),
  });
}

async function confirmAddToAssetLibrary() {
  const row = currentLibraryAsset.value;
  if (!row) return;
  const name = libraryAssetName.value.trim();
  if (!name) {
    window.$message.warning("请输入资产名称");
    return;
  }
  addingLibraryIds.value.add(row.id);
  try {
    const res = await axios.post("/production/assets/addToAssetLibrary", {
      id: row.id,
      projectId: project.value?.id,
      name,
      allowDuplicate: !!row.libraryAssetId,
    });
    row.libraryAssetId = res.data?.assetId;
    window.$message.success(res.data?.message || "已添加到资产库");
    addLibraryVisible.value = false;
  } catch (e) {
    window.$message.error((e as any)?.message || "添加到资产库失败");
  } finally {
    addingLibraryIds.value.delete(row.id);
  }
}

async function save({ imageUrl, flowId }: { imageUrl: string; flowId: number }) {
  // 更新对应分镜的 src
  if (!imageUrl) return;
  for (const i of assets.value) {
    const target = i.derive.find((s) => s.id === currentAssetsId.value);
    if (target) {
      target.state = '已完成'
      target.src = imageUrl;
      target.flowId = flowId;
      break;
    }
  }

  await axios.post("/production/assets/updateAssetsUrl", {
    id: currentAssetsId.value,
    url: imageUrl,
    flowId,
  });
}

async function removeFn(id: number) {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.assets.confirmDeleteHeader"),
    body: $t("workbench.production.node.assets.confirmDeleteBody"),
    confirmBtn: $t("workbench.assets.deleteBtn"),
    cancelBtn: $t("workbench.assets.cancelBtn"),
    theme: "warning",
    onConfirm: async () => {
      try {
        await axios.post("/production/assets/deleteAssetsDireve", {
          id,
          projectId: project.value?.id,
        });
        //找到对应子资产删除
        assets.value.forEach((item) => {
          const targetIndex = item.derive.findIndex((s) => s.id === id);
          if (targetIndex !== -1) {
            item.derive.splice(targetIndex, 1);
          }
        });
      } catch (e) {
        window.$message.error((e as any)?.message || $t("workbench.production.node.assets.removeFailed"));
      } finally {
        dialog.destroy();
      }
    },
  });
}

async function removeAssetFn(id: number) {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.assets.confirmDeleteHeader"),
    body: $t("workbench.production.node.assets.confirmDeleteAssetBody"),
    confirmBtn: $t("workbench.assets.deleteBtn"),
    cancelBtn: $t("workbench.assets.cancelBtn"),
    theme: "warning",
    onConfirm: async () => {
      try {
        await axios.post("/production/assets/deleteAsset", {
          id,
          projectId: project.value?.id,
        });
        // 从 assets 列表中移除该顶层资产（其衍生会一并删除）
        const targetIndex = assets.value.findIndex((s) => s.id === id);
        if (targetIndex !== -1) {
          assets.value.splice(targetIndex, 1);
        }
      } catch (e) {
        window.$message.error((e as any)?.message || $t("workbench.production.node.assets.removeFailed"));
      } finally {
        dialog.destroy();
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.assets {
  width: fit-content;
  user-select: text;
  cursor: default;

  .titleBar {
    cursor: grab;
    user-select: none;

    .title {
      background-color: #000;
      width: fit-content;
      padding: 5px 10px;
      color: #fff;
      border-radius: 8px 0;
      font-size: 16px;
    }
  }

  .addLibraryForm {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .formLabel {
      font-size: 13px;
      color: var(--td-text-color-secondary);
    }
  }

  .content {
    margin-top: 8px;

    .cardGrid {
      display: flex;
      flex-direction: column;

      .assetItemBox {
        display: flex;
        align-items: stretch;
        gap: 12px;
        padding: 10px;
        content-visibility: auto;
        contain-intrinsic-size: auto 250px;

        &:not(:first-child) {
          margin-top: 8px;
        }

        .assetCard {
          width: 200px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          &:hover {
            .remove {
              opacity: 1;
            }
          }
          .remove {
            position: absolute;
            top: 3px;
            right: 3px;
            z-index: 9999;
            padding: 5px;
            border-radius: 10px;
            background-color: rgba(220, 50, 50, 0.7);
            cursor: pointer;
            opacity: 0;
            &:hover {
              background-color: rgba(220, 50, 50, 1);
            }
          }
          .assetImageWrap {
            width: 100%;
            aspect-ratio: 1 / 1;

            &.assetImagePlaceholder {
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: var(--td-bg-color-container-hover, #f5f5f5);
              border-radius: 4px;
              overflow: hidden;
            }

            .assetImage {
              height: 100%;
              border-radius: 4px;

              .imageToolsWrap {
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease;
              }

              &:hover .imageToolsWrap {
                opacity: 1;
                pointer-events: auto;
              }
            }
          }

          .cardInfo {
            margin-top: 8px;

            .cardName {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 13px;
              font-weight: 600;
              color: #333;

              .nameText {
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
                max-width: 120px;
              }
            }

            .cardDesc {
              font-size: 11px;
              color: #999;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
          }
        }

        .divider {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .deriveAssets {
          display: flex;
          align-items: stretch;
          gap: 12px;

          .emptyCard {
            display: flex;
            align-items: center;
            justify-content: center;

            :deep(.t-card__body) {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          }
        }
      }
    }
  }
}
</style>
