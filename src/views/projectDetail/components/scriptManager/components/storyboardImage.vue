<template>
  <div class="storyboard-image">
    <!-- 头部 -->
    <div class="header">
      <div class="title">
        <div class="icon-wrapper">
          <i-pic :size="20" class="icon" />
        </div>
        <span>生成分镜图</span>
        <span v-if="data.length" class="count">{{ data.length }}</span>
      </div>
      <button v-if="canGenerate" :disabled="!disableBtn" class="generate-btn" @click="modalShow = true">
        <i-optimize :size="18" />
        <span>生成分镜图</span>
      </button>
    </div>

    <!-- 内容区 -->
    <div class="content">
      <template v-if="data.length">
        <div class="image-grid">
          <div v-for="(item, index) in data" :key="item.id" class="image-card" @click="handleEdit(item)">
            <!-- 序号标签 -->
            <div class="shot-badge">片段{{ item.segmentId }}-{{ item.shotIndex }}镜头</div>

            <!-- 封面区域 -->
            <div class="cover-wrapper">
              <el-image class="cover-image" :src="item.filePath" fit="cover">
                <template #placeholder>
                  <div class="loading-placeholder">
                    <div class="loading-spinner"></div>
                  </div>
                </template>
                <template #error>
                  <div class="error-placeholder">
                    <i-error-picture theme="outline" :size="28" fill="#ef4444" />
                    <span>加载失败</span>
                  </div>
                </template>
              </el-image>

              <!-- 悬浮操作层 -->
              <div class="hover-overlay">
                <div class="action-btn">
                  <i-edit :size="20" />
                  <span>编辑</span>
                </div>
              </div>
            </div>

            <!-- 信息区域 -->
            <div class="info-wrapper">
              <h4 v-if="item.name" class="card-title">{{ item.name }}</h4>
              <p class="card-desc">{{ item.prompt || "暂无描述" }}</p>
            </div>
          </div>
        </div>
      </template>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">
          <i-pic :size="48" />
        </div>
        <p class="empty-title">暂无分镜图</p>
        <p class="empty-desc">点击上方按钮开始生成分镜图</p>
      </div>
    </div>

    <!-- 弹窗 -->
    <storyboardChat v-if="modalShow" v-model="modalShow" :scriptId="scriptId" :projectId="projectId" @save="$emit('save')" />
    <storyboardEditor ref="storyboardEditorRef" @save="handelrEditSave" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import storyboardChat from "./storyboardImage/storyboardChat.vue";
import storyboardEditor from "@/components/storyboardEditor/index.vue";
import axios from "@/utils/axios";

interface Storyboard {
  id: number;
  name: string;
  intro: string;
  prompt: string;
  filePath: string;
  duration: number;
  segmentId: number; // 片段ID
  shotIndex: number; // 镜头在片段内的序号
  generateImg: { assetsId: number; filePath: string }[];
  dialogue: string;
  narration: string;
  videoPrompt: string;
}

const emit = defineEmits(["save"]);
const props = defineProps<{
  data: Storyboard[];
  projectId: number;
  scriptId: number | null;
  disableBtn: number | null;
  canGenerate: boolean;
}>();

const modalShow = ref(false);
const storyboardEditorRef = ref<InstanceType<typeof storyboardEditor> | null>(null);

function handleEdit(item: Storyboard) {
  storyboardEditorRef.value?.doFusionEdit({
    id: item.id,
    filePath: item.filePath,
    scriptId: props.scriptId ?? undefined,
    otherImgs: [],
    prompt: item.prompt || "",
    intro: item.intro || "",
    generateImg: item.generateImg || [],
    editPrompt: "",
    duration: item.duration ?? undefined,
    dialogue: item.dialogue ?? undefined,
    narration: item.narration ?? undefined,
    videoPrompt: item.videoPrompt ?? undefined,
  });
}

function handelrEditSave(data: any) {
  axios.post("/storyboard/saveStoryboard", data).then(() => {
    emit("save");
  });
}
</script>

<style lang="scss" scoped>
.storyboard-image {
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: linear-gradient(135deg, #faf5ff 0%, #f0f9ff 50%, #eff6ff 100%);
    border-radius: 16px;
    border: 1px solid rgba(147, 51, 234, 0.1);

    .title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      font-size: 16px;
      color: #1f2937;

      .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #9333ea, #7c3aed);
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);

        .icon {
          color: #fff;
        }
      }

      .count {
        padding: 2px 10px;
        background: rgba(147, 51, 234, 0.1);
        color: #9333ea;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
      }
    }

    .generate-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #9333ea, #7c3aed);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 14px rgba(147, 51, 234, 0.35);

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(147, 51, 234, 0.45);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }

      &:disabled {
        background: #d1d5db;
        box-shadow: none;
        cursor: not-allowed;
      }
    }
  }

  .content {
    margin-top: 24px;

    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }

    .image-card {
      position: relative;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 1px solid #f3f4f6;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        border-color: rgba(147, 51, 234, 0.2);

        .hover-overlay {
          opacity: 1;
        }

        .cover-image {
          transform: scale(1.05);
        }
      }

      .shot-badge {
        position: absolute;
        top: 12px;
        left: 12px;
        z-index: 10;
        padding: 4px 12px;
        background: linear-gradient(135deg, #9333ea, #7c3aed);
        color: #fff;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(147, 51, 234, 0.4);
      }

      .cover-wrapper {
        position: relative;
        width: 100%;
        height: 180px;
        overflow: hidden;
        background: linear-gradient(135deg, #f9fafb, #f3f4f6);

        .cover-image {
          width: 100%;
          height: 100%;
          transition: transform 0.4s ease;

          :deep(img) {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }

        .loading-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #f9fafb, #f3f4f6);

          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #e5e7eb;
            border-top-color: #9333ea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
        }

        .error-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          height: 100%;
          background: #fef2f2;

          span {
            font-size: 13px;
            color: #ef4444;
          }
        }

        .hover-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          backdrop-filter: blur(2px);

          .action-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.95);
            color: #9333ea;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            transition: transform 0.2s ease;

            &:hover {
              transform: scale(1.05);
            }
          }
        }
      }

      .info-wrapper {
        padding: 16px;

        .card-title {
          margin: 0 0 8px;
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-desc {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 2;
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
      background: linear-gradient(135deg, #fafafa, #f5f5f5);
      border-radius: 16px;
      border: 2px dashed #e5e7eb;

      .empty-icon {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9333ea;
        margin-bottom: 20px;
      }

      .empty-title {
        margin: 0 0 8px;
        font-size: 18px;
        font-weight: 600;
        color: #374151;
      }

      .empty-desc {
        margin: 0;
        font-size: 14px;
        color: #9ca3af;
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
