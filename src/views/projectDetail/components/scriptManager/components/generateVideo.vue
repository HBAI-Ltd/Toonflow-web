<template>
  <div class="storyboard-video">
    <!-- 头部 -->
    <div class="header">
      <div class="title">
        <div class="icon-wrapper">
          <i-pic :size="20" class="icon" />
        </div>
        <span>视频配置</span>
        <span v-if="currentConfigs.length" class="count">{{ currentConfigs.length }}</span>
      </div>
      <div class="header-btns">
        <button v-if="canGenerate && currentConfigs.length > 0" :disabled="!disableBtn" class="batch-delete-btn" @click="openBatchDelete">
          <i-delete :size="18" />
          <span>批量删除</span>
        </button>
        <button v-if="canGenerate && currentConfigs.length > 0" :disabled="!disableBtn" class="batch-polish-btn" @click="openBatchPolish">
          <i-magic :size="18" />
          <span>批量润色</span>
        </button>
        <button v-if="canGenerate && currentConfigs.length > 0" :disabled="!disableBtn" class="batch-generate-btn" @click="openBatchGenerate">
          <i-video-two :size="18" />
          <span>批量生成</span>
        </button>
        <button v-if="canGenerate" :disabled="!disableBtn" class="generate-btn" @click="modalShow = true">
          <i-video-two :size="18" />
          <span>添加配置</span>
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="content">
      <template v-if="currentConfigs.length">
        <div class="video-grid">
          <div v-for="(config, index) in currentConfigs" :key="config.id" class="video-card" @click="openDetail(config)">
            <!-- 视频编号 -->
            <div class="video-index">#{{ index + 1 }}</div>

            <!-- 封面区域 -->
            <div class="cover-wrapper">
              <!-- 有生成中的结果 - 优先显示 -->
              <template v-if="hasGeneratingResult(config.id)">
                <div class="status-wrapper generating">
                  <div class="loading-spinner"></div>
                  <span class="status-text">正在生成中...</span>
                  <span class="status-hint">{{ getResultCount(config.id) }}个结果</span>
                </div>
              </template>

              <!-- 已选择结果且成功 -->
              <template v-else-if="getSelectedResult(config.id)?.state === 1">
                <img
                  v-if="getSelectedResult(config.id)?.firstFrame"
                  :src="getSelectedResult(config.id)?.firstFrame"
                  class="cover-image"
                  alt="视频封面" />
                <video
                  v-else-if="getSelectedResult(config.id)?.filePath"
                  :src="getSelectedResult(config.id)?.filePath"
                  class="cover-image"
                  preload="metadata"></video>
                <div v-else class="video-placeholder">
                  <i-film :size="32" />
                  <span>视频</span>
                </div>
                <!-- <img :src="getSelectedResult(config.id)?.firstFrame || getSelectedResult(config.id)?.filePath" class="cover-image" alt="视频封面" /> -->
                <div class="play-overlay">
                  <div class="play-button">
                    <i-play-one theme="filled" :size="32" fill="#fff" />
                  </div>
                </div>
                <div v-if="getSelectedResult(config.id)?.duration" class="duration-badge">
                  {{ formatDuration(getSelectedResult(config.id)!.duration) }}
                </div>
              </template>

              <!-- 未生成/待生成 -->
              <template v-else>
                <div class="status-wrapper pending">
                  <div class="pending-icon">
                    <i-setting-config :size="32" />
                  </div>
                  <span class="status-text">待生成</span>
                  <span class="status-hint">点击进入生成</span>
                </div>
              </template>
            </div>

            <!-- 信息区域 -->
            <div class="info-wrapper">
              <div class="config-info">
                <span class="manufacturer-tag">{{ getManufacturerLabel(config.manufacturer) }}</span>
                <span class="resolution-tag" v-if="config.resolution">{{ config.resolution }}</span>
                <span class="duration-tag">{{ config.duration }}s</span>
              </div>
              <p class="prompt-text">{{ config.prompt || "暂无描述" }}</p>
            </div>

            <!-- 删除按钮 -->
            <button class="delete-btn" @click.stop="handleDeleteConfig(config.id)">
              <i-delete :size="16" />
            </button>
          </div>
        </div>
      </template>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">
          <i-video-two :size="48" />
        </div>
        <p class="empty-title">暂无视频配置</p>
        <p class="empty-desc">点击上方按钮添加视频配置</p>
      </div>
    </div>

    <!-- 添加配置弹窗 -->
    <newVideo v-if="modalShow && scriptId" v-model="modalShow" :scriptId="scriptId" />

    <!-- 视频详情弹窗 -->
    <videoDetail v-model="detailModalShow" :configId="currentConfigId" />

    <!-- 批量生成弹窗 -->
    <t-dialog
      v-model:visible="batchGenerateVisible"
      header="批量生成视频"
      width="700px"
      :confirmLoading="batchGenerateLoading"
      @confirm="handleBatchGenerateOk"
      @cancel="batchGenerateVisible = false"
      confirmText="开始生成">
      <div class="batchConfigContent">
        <t-alert message="将按顺序为选中的配置生成视频，并发数受设置控制" type="info" style="margin-bottom: 16px" />

        <div class="batchForm">
          <div class="batchFormItem">
            <label class="batchLabel">选择配置：</label>
            <div class="batchCheckboxList">
              <div v-for="(config, index) in currentConfigs" :key="`generate-${index}-${config.id}`" class="batchCheckboxItem">
                <label class="custom-checkbox">
                  <input type="checkbox" :value="config.id" v-model="selectedConfigIds" />
                  <div class="checkboxItemContent">
                    <span class="itemIndex">#{{ index + 1 }}</span>
                    <span class="itemModel">{{ getManufacturerLabel(config.manufacturer) }}</span>
                    <span class="itemDuration">{{ config.duration }}s</span>
                    <span class="itemPrompt">{{ config.prompt || "暂无描述" }}</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div class="batchFormItem batchFormItemFooter">
            <t-button variant="text" size="small" @click="selectAllConfigs">全选</t-button>
            <t-button variant="text" size="small" @click="clearSelectedConfigs">清空</t-button>
            <span class="selectedCount">已选择 {{ selectedConfigIds.length }} 个配置</span>
          </div>
        </div>
      </div>
    </t-dialog>

    <!-- 批量删除弹窗 -->
    <t-dialog
      v-model:visible="batchDeleteVisible"
      header="批量删除视频配置"
      width="700px"
      :confirmLoading="batchDeleteLoading"
      @confirm="handleBatchDeleteOk"
      @cancel="batchDeleteVisible = false"
      confirmText="确认删除"
      theme="danger">
      <div class="batchConfigContent">
        <t-alert message="删除后无法恢复，关联的生成结果也会被删除" type="warning" style="margin-bottom: 16px" />

        <div class="batchForm">
          <div class="batchFormItem">
            <label class="batchLabel">选择配置：</label>
            <div class="batchCheckboxList">
              <div v-for="(config, index) in currentConfigs" :key="`delete-${index}-${config.id}`" class="batchCheckboxItem">
                <label class="custom-checkbox">
                  <input type="checkbox" :value="config.id" v-model="deleteConfigIds" />
                  <div class="checkboxItemContent">
                    <span class="itemIndex">#{{ index + 1 }}</span>
                    <span class="itemModel">{{ getManufacturerLabel(config.manufacturer) }}</span>
                    <span class="itemDuration">{{ config.duration }}s</span>
                    <span class="itemPrompt">{{ config.prompt || "暂无描述" }}</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div class="batchFormItem batchFormItemFooter">
            <t-button variant="text" size="small" @click="selectAllDeleteConfigs">全选</t-button>
            <t-button variant="text" size="small" @click="clearDeleteConfigs">清空</t-button>
            <span class="selectedCount">已选择 {{ deleteConfigIds.length }} 个配置</span>
          </div>
        </div>
      </div>
    </t-dialog>

    <!-- 批量润色弹窗 -->
    <t-dialog
      v-model:visible="batchPolishVisible"
      header="批量润色提示词"
      width="700px"
      :confirmLoading="batchPolishLoading"
      @confirm="handleBatchPolishOk"
      @cancel="batchPolishVisible = false"
      confirmText="开始润色">
      <div class="batchConfigContent">
        <t-alert message="将按顺序为选中的配置润色提示词，并发数受设置控制" type="info" style="margin-bottom: 16px" />

        <div class="batchForm">
          <div class="batchFormItem">
            <label class="batchLabel">选择配置：</label>
            <div class="batchCheckboxList">
              <div v-for="(config, index) in currentConfigs" :key="`polish-${index}-${config.id}`" class="batchCheckboxItem">
                <label class="custom-checkbox">
                  <input type="checkbox" :value="config.id" v-model="polishConfigIds" />
                  <div class="checkboxItemContent">
                    <span class="itemIndex">#{{ index + 1 }}</span>
                    <span class="itemModel">{{ getManufacturerLabel(config.manufacturer) }}</span>
                    <span class="itemDuration">{{ config.duration }}s</span>
                    <span class="itemPrompt">{{ config.prompt || "暂无描述" }}</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div class="batchFormItem batchFormItemFooter">
            <t-button variant="text" size="small" @click="selectAllPolishConfigs">全选</t-button>
            <t-button variant="text" size="small" @click="clearPolishConfigs">清空</t-button>
            <span class="selectedCount">已选择 {{ polishConfigIds.length }} 个配置</span>
          </div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Modal, message } from "ant-design-vue";
import newVideo from "./generateVideo/newVideo.vue";
import videoDetail from "./generateVideo/videoDetail.vue";
import videoStore, { type VideoConfig, type VideoResult } from "@/stores/video";
import { storeToRefs } from "pinia";
import settingStore from "@/stores/setting";
const { otherSetting } = storeToRefs(settingStore());

const props = defineProps<{
  scriptId: number | null;
  disableBtn: boolean;
  canGenerate: boolean;
}>();

const store = videoStore();
const { currentConfigs } = storeToRefs(store);

const modalShow = ref(false);
const detailModalShow = ref(false);
const currentConfigId = ref<number | null>(null);

// 厂商标签映射
const manufacturerLabels: Record<string, string> = {
  volcengine: "豆包",
  runninghub: "Sora",
  openAi: "OpenAI",
};

const batchGenerateVisible = ref(false);
const batchGenerateLoading = ref(false);
const selectedConfigIds = ref<number[]>([]);
const batchDeleteVisible = ref(false);
const batchDeleteLoading = ref(false);
const deleteConfigIds = ref<number[]>([]);
const batchPolishVisible = ref(false);
const batchPolishLoading = ref(false);
const polishConfigIds = ref<number[]>([]);

function getManufacturerLabel(manufacturer: string): string {
  return manufacturerLabels[manufacturer] || manufacturer;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// 获取配置的选中结果
function getSelectedResult(configId: number): VideoResult | null {
  return store.getSelectedResult(configId);
}

// 检查是否有生成中的结果
function hasGeneratingResult(configId: number): boolean {
  const results = store.getResultsByConfigId(configId);
  return results.some((r) => r.state === 0);
}

// 获取结果数量
function getResultCount(configId: number): number {
  return store.getResultsByConfigId(configId).length;
}

// 打开详情弹窗
function openDetail(config: VideoConfig) {
  currentConfigId.value = config.id;
  detailModalShow.value = true;
}

// 删除配置
function handleDeleteConfig(configId: number) {
  Modal.confirm({
    title: "确认删除",
    content: "删除配置后，关联的所有生成结果也会被删除，确定要删除吗？",
    okText: "确定",
    cancelText: "取消",
    onOk() {
      store.removeConfig(configId);
      message.success("删除成功");
    },
  });
}

function openBatchGenerate() {
  selectedConfigIds.value = [];
  batchGenerateVisible.value = true;
}
function selectAllConfigs() {
  selectedConfigIds.value = currentConfigs.value.map((c) => c.id);
}
function clearSelectedConfigs() {
  selectedConfigIds.value = [];
}
async function handleBatchGenerateOk() {
  if (selectedConfigIds.value.length === 0) {
    message.warning("请至少选择一个配置");
    return;
  }
  batchGenerateLoading.value = true;
  try {
    const batchSize = otherSetting.value.videoBatchGenereateSize || 3;
    await store.batchGenerateVideos(selectedConfigIds.value, batchSize);
    message.success(`已提交 ${selectedConfigIds.value.length} 个视频生成任务`);
    batchGenerateVisible.value = false;
  } catch (error: any) {
    message.error(error?.message || "批量生成失败");
  } finally {
    batchGenerateLoading.value = false;
  }
}
function openBatchDelete() {
  deleteConfigIds.value = [];
  batchDeleteVisible.value = true;
}
function selectAllDeleteConfigs() {
  deleteConfigIds.value = currentConfigs.value.map((c) => c.id);
}
function clearDeleteConfigs() {
  deleteConfigIds.value = [];
}
async function handleBatchDeleteOk() {
  if (deleteConfigIds.value.length === 0) {
    message.warning("请至少选择一个配置");
    return;
  }
  batchDeleteLoading.value = true;
  try {
    await store.batchRemoveConfigs(deleteConfigIds.value);
    message.success(`已删除 ${deleteConfigIds.value.length} 个视频配置`);
    batchDeleteVisible.value = false;
  } catch (error: any) {
    message.error(error?.message || "批量删除失败");
  } finally {
    batchDeleteLoading.value = false;
  }
}
function openBatchPolish() {
  polishConfigIds.value = [];
  batchPolishVisible.value = true;
}
function selectAllPolishConfigs() {
  polishConfigIds.value = currentConfigs.value.map((c) => c.id);
}
function clearPolishConfigs() {
  polishConfigIds.value = [];
}
async function handleBatchPolishOk() {
  if (polishConfigIds.value.length === 0) {
    message.warning("请至少选择一个配置");
    return;
  }
  batchPolishLoading.value = true;
  try {
    const batchSize = otherSetting.value.videoBatchGenereateSize || 3;
    await store.batchPolishPrompts(polishConfigIds.value, batchSize);
    message.success(`已润色 ${polishConfigIds.value.length} 个视频配置的提示词`);
    batchPolishVisible.value = false;
  } catch (error: any) {
    message.error(error?.message || "批量润色失败");
  } finally {
    batchPolishLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.storyboard-video {
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: var(--td-bg-color-container);
    border-radius: 16px;
    border: 1px solid var(--td-component-border);

    .title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      font-size: 16px;
      color: var(--td-text-color-primary);

      .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: var(--td-brand-color);
        border-radius: 10px;
        box-shadow: 0 4px 12px var(--td-shadow-1);

        .icon {
          color: var(--td-text-color-anti);
        }
      }

      .count {
        padding: 2px 10px;
        background: var(--td-bg-color-component);
        color: var(--td-brand-color);
        border: 1px solid var(--td-component-border);
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
      }
    }

    .header-btns {
      display: flex;
      gap: 12px;
    }

    .generate-btn,
    .batch-generate-btn,
    .batch-delete-btn,
    .batch-polish-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: var(--td-brand-color);
      color: var(--td-text-color-anti);
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 14px var(--td-shadow-1);

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        background: var(--td-brand-color-hover);
        box-shadow: 0 6px 20px var(--td-shadow-2);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }

      &:disabled {
        background: var(--td-bg-color-component-disabled);
        color: var(--td-text-color-disabled);
        box-shadow: none;
        cursor: not-allowed;
        opacity: 0.6;
      }
    }

    .batch-generate-btn {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45);
      }
    }

    .batch-delete-btn {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45);
      }
    }

    .batch-polish-btn {
      background: linear-gradient(135deg, #9333ea, #7c3aed);
      box-shadow: 0 4px 14px rgba(147, 51, 234, 0.35);

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        box-shadow: 0 6px 20px rgba(147, 51, 234, 0.45);
      }
    }

    .generate-btn:active:not(:disabled),
    .batch-generate-btn:active:not(:disabled),
    .batch-delete-btn:active:not(:disabled),
    .batch-polish-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .generate-btn:disabled,
    .batch-generate-btn:disabled,
    .batch-delete-btn:disabled,
    .batch-polish-btn:disabled {
      background: var(--td-bg-color-component-disabled);
      box-shadow: none;
      cursor: not-allowed;
    }
  }

  .content {
    margin-top: 24px;

    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }

    .video-card {
      position: relative;
      background: var(--td-bg-color-container);
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 1px solid var(--td-component-border);
      box-shadow: 0 2px 8px var(--td-shadow-1);

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px var(--td-shadow-3);
        border-color: var(--td-brand-color);

        .play-overlay {
          opacity: 1;
          z-index: 2;
        }

        .cover-image {
          transform: scale(1.05);
        }

        .delete-btn {
          opacity: 1;
          z-index: 3;
        }
      }

      .video-index {
        position: absolute;
        top: 10px;
        left: 10px;
        min-width: 24px;
        height: 24px;
        padding: 0 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--td-brand-color);
        border-radius: 6px;
        color: var(--td-text-color-anti);
        font-size: 12px;
        font-weight: 600;
        z-index: 10;
      }

      .delete-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--td-error-color);
        border: none;
        border-radius: 8px;
        color: var(--td-text-color-anti);
        cursor: pointer;
        opacity: 0;
        transition: all 0.2s ease;
        z-index: 10;

        &:hover {
          background: var(--td-error-color-hover);
          transform: scale(1.1);
        }
      }

      .cover-wrapper {
        position: relative;
        width: 100%;
        height: 180px;
        overflow: hidden;
        background: var(--td-bg-color-component);

        .cover-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .video-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 8px;
          color: var(--td-text-color-placeholder);

          span {
            font-size: 14px;
          }
        }

        .play-overlay {
          position: absolute;
          inset: 0;
          background: var(--td-mask-active);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;

          .play-button {
            width: 60px;
            height: 60px;
            background: var(--td-brand-color);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
            transition: transform 0.2s ease;

            &:hover {
              transform: scale(1.1);
              background: var(--td-brand-color-hover);
            }
          }
        }

        .duration-badge {
          position: absolute;
          bottom: 10px;
          right: 10px;
          padding: 4px 10px;
          background: var(--td-mask-active);
          color: var(--td-text-color-anti);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          backdrop-filter: blur(4px);
        }

        .status-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;

          &.success {
            background: var(--td-success-color);
            color: var(--td-text-color-anti);
          }
        }

        .status-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 12px;

          &.generating {
            .loading-spinner {
              width: 40px;
              height: 40px;
              border: 3px solid var(--td-component-border);
              border-top-color: var(--td-brand-color);
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }

            .status-text {
              color: var(--td-text-color-secondary);
              font-size: 14px;
              font-weight: 500;
            }

            .status-hint {
              color: var(--td-text-color-placeholder);
              font-size: 12px;
            }
          }

          &.pending {
            .pending-icon {
              width: 50px;
              height: 50px;
              background: var(--td-bg-color-component);
              border: 1px solid var(--td-component-border);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: var(--td-brand-color);
            }

            .status-text {
              color: var(--td-text-color-secondary);
              font-size: 14px;
              font-weight: 500;
            }

            .status-hint {
              color: var(--td-text-color-placeholder);
              font-size: 12px;
            }
          }
        }
      }

      .info-wrapper {
        padding: 16px;

        .config-info {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
          flex-wrap: wrap;

          .manufacturer-tag,
          .resolution-tag,
          .duration-tag {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }

          .manufacturer-tag {
            background: var(--td-brand-color-1);
            color: var(--td-brand-color);
            border: 1px solid var(--td-brand-color-2);
          }

          .resolution-tag {
            background: var(--td-bg-color-component);
            color: var(--td-text-color-secondary);
            border: 1px solid var(--td-component-border);
          }

          .duration-tag {
            background: var(--td-success-color-1);
            color: var(--td-success-color);
            border: 1px solid var(--td-success-color-2);
          }
        }

        .prompt-text {
          margin: 0;
          font-size: 14px;
          color: var(--td-text-color-secondary);
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      background: var(--td-bg-color-container);
      border-radius: 16px;
      border: 2px dashed var(--td-component-border);

      .empty-icon {
        width: 80px;
        height: 80px;
        background: var(--td-bg-color-component);
        border: 1px solid var(--td-component-border);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--td-brand-color);
        margin-bottom: 20px;
      }

      .empty-title {
        margin: 0 0 8px;
        font-size: 18px;
        font-weight: 600;
        color: var(--td-text-color-primary);
      }

      .empty-desc {
        margin: 0;
        font-size: 14px;
        color: var(--td-text-color-placeholder);
      }
    }
  }

  .batchConfigContent {
    .batchForm {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .batchFormItem {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .batchLabel {
        font-size: 14px;
        font-weight: 500;
        color: var(--td-text-color-primary);
      }

      .batchCheckboxList {
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid var(--td-component-border);
        border-radius: 8px;

        .batchCheckboxItem {
          padding: 12px 16px;
          border-bottom: 1px solid var(--td-component-border);

          &:last-child {
            border-bottom: none;
          }

          &:hover {
            background: var(--td-bg-color-container-hover);
          }

          .custom-checkbox {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            cursor: pointer;

            input[type="checkbox"] {
              margin-top: 3px;
              width: 16px;
              height: 16px;
              cursor: pointer;
            }
          }

          .checkboxItemContent {
            display: flex;
            align-items: center;
            gap: 12px;

            .itemIndex {
              min-width: 40px;
              color: var(--td-brand-color);
              font-weight: 600;
            }

            .itemModel {
              padding: 2px 8px;
              background: var(--td-brand-color-1);
              color: var(--td-brand-color);
              border-radius: 4px;
              font-size: 12px;
            }

            .itemDuration {
              padding: 2px 8px;
              background: var(--td-success-color-1);
              color: var(--td-success-color);
              border-radius: 4px;
              font-size: 12px;
            }

            .itemPrompt {
              flex: 1;
              color: var(--td-text-color-secondary);
              font-size: 13px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }
      }

      &.batchFormItemFooter {
        flex-direction: row;
        align-items: center;
        gap: 8px;

        .selectedCount {
          margin-left: auto;
          color: var(--td-text-color-secondary);
          font-size: 13px;
        }
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
