<template>
  <t-dialog
    placement="center"
    width="60vw"
    v-model:visible="visible"
    :header="$t('settings.vendor.test.textTitle') + ' - ' + modelName"
    :footer="false"
    @closed="handleClose">
    <div class="textTestDialog">
      <!-- 消息列表 -->
      <div class="messageList" ref="messageListRef">
        <div v-if="messages.length === 0" class="emptyHint">
          {{ $t("settings.vendor.test.textEmptyHint") }}
        </div>
        <div v-for="(msg, idx) in messages" :key="idx" class="messageItem" :class="msg.role">
          <div class="bubble">
            <div class="role">
              {{ msg.role === "user" ? $t("settings.vendor.test.you") : $t("settings.vendor.test.assistant") }}
            </div>
            <div class="content" v-if="msg.role === 'assistant'">
              <span v-if="msg.thinking" class="thinkContent">
                <i-thinking-problem theme="outline" size="14" />
                {{ msg.thinking }}
              </span>
              <span>{{ msg.content }}</span>
              <span v-if="msg.loading" class="cursor">▌</span>
            </div>
            <div class="content" v-else>
              <!-- 用户消息中包含的图片预览 -->
              <div v-if="msg.images && msg.images.length > 0" class="msgImages">
                <t-image-viewer
                  v-for="(img, imgIdx) in msg.images"
                  :key="imgIdx"
                  :images="[img]"
                  :closeOnEscKeydown="true"
                  :closeOnOverlay="true">
                  <template #trigger>
                    <img :src="img" class="msgImageThumb" alt="msg image" />
                  </template>
                </t-image-viewer>
              </div>
              <div v-if="msg.content" class="msgText">{{ msg.content }}</div>
            </div>
          </div>
        </div>
      </div>
      <!-- 输入区域 -->
      <div class="inputArea">
        <!-- 待发送图片暂存预览区（可选） -->
        <div v-if="pendingImages.length > 0" class="pendingImagesArea">
          <div v-for="(img, idx) in pendingImages" :key="idx" class="pendingImageItem">
            <img :src="img" class="thumb" alt="pending" />
            <button class="removeBtn" @click="removePendingImage(idx)">
              <i-close theme="outline" size="10" />
            </button>
          </div>
        </div>

        <t-textarea
          v-model="inputText"
          :placeholder="$t('settings.vendor.test.textInputPlaceholder')"
          :autosize="{ minRows: 2, maxRows: 5 }"
          :disabled="loading"
          @keydown.enter.ctrl.exact="handleSend"
          @paste="handlePaste" />
        <div class="inputActions">
          <div class="leftTools">
            <span class="hint">Ctrl + Enter {{ $t("settings.vendor.test.send") }}</span>
            <div class="thinkSwitch">
              <t-switch v-model="thinkOn" size="small" :disabled="loading" />
              <span class="thinkLabel">{{ $t("settings.vendor.test.thinkMode") }}</span>
              <t-select v-model="thinkLevel" size="small" class="thinkLevelSelect" :disabled="loading || !thinkOn">
                <t-option :value="0" :label="$t('settings.vendor.test.levelLight')" />
                <t-option :value="1" :label="$t('settings.vendor.test.levelLow')" />
                <t-option :value="2" :label="$t('settings.vendor.test.levelMedium')" />
                <t-option :value="3" :label="$t('settings.vendor.test.levelHigh')" />
              </t-select>
            </div>
            <input
              ref="imageInputRef"
              type="file"
              accept="image/*"
              multiple
              style="display: none"
              @change="handleImageFileChange" />
            <t-tooltip :content="$t('settings.vendor.test.uploadImage') || '上传图片(可选)'" placement="top">
              <t-button
                variant="text"
                shape="square"
                size="small"
                class="uploadBtn"
                :disabled="loading"
                @click="triggerImageSelect">
                <template #icon>
                  <i-picture theme="outline" size="16" />
                </template>
              </t-button>
            </t-tooltip>
          </div>
          <div class="btns">
            <t-button variant="outline" size="small" :disabled="loading || (messages.length === 0 && pendingImages.length === 0)" @click="handleClear">
              {{ $t("settings.vendor.test.clearHistory") }}
            </t-button>
            <t-button theme="primary" size="small" :loading="loading" :disabled="!canSend" @click="handleSend">
              <template #icon><i-send theme="outline" /></template>
              {{ $t("settings.vendor.test.send") }}
            </t-button>
          </div>
        </div>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";

const props = defineProps<{
  vendorId: string;
  modelName: string;
}>();
const visible = defineModel<boolean>("modelVisible");

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  thinking?: string;
  loading?: boolean;
}

const messages = ref<Message[]>([]);
const inputText = ref("");
const pendingImages = ref<string[]>([]);
const imageInputRef = ref<HTMLInputElement | null>(null);
const loading = ref(false);
const thinkOn = ref(false);
const thinkLevel = ref<0 | 1 | 2 | 3>(0);
const messageListRef = ref<HTMLDivElement | null>(null);

const canSend = computed(() => {
  return !loading.value && (!!inputText.value.trim() || pendingImages.value.length > 0);
});

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  });
}

const fileToDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function triggerImageSelect() {
  imageInputRef.value?.click();
}

async function handleImageFileChange(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || []);
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      const b64 = await fileToDataURL(file);
      pendingImages.value.push(b64);
    }
  }
  (e.target as HTMLInputElement).value = "";
}

function removePendingImage(idx: number) {
  pendingImages.value.splice(idx, 1);
}

async function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      if (file) {
        const b64 = await fileToDataURL(file);
        pendingImages.value.push(b64);
      }
    }
  }
}

async function handleSend() {
  const text = inputText.value.trim();
  const imgs = [...pendingImages.value];
  if ((!text && imgs.length === 0) || loading.value) return;

  messages.value.push({ role: "user", content: text, images: imgs.length > 0 ? imgs : undefined });
  inputText.value = "";
  pendingImages.value = [];
  loading.value = true;

  const assistantMsg: Message = { role: "assistant", content: "", loading: true };
  messages.value.push(assistantMsg);
  scrollToBottom();

  try {
    const history = messages.value.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
      images: m.images,
    }));

    const { data } = await axios.post("/setting/vendorConfig/modelTest/textTest", {
      modelName: props.modelName,
      id: props.vendorId,
      messages: history,
      ...(thinkOn.value ? { think: true, thinkLevel: thinkLevel.value } : {}),
    });

    assistantMsg.content = typeof data === "string" ? data : (data?.content ?? JSON.stringify(data));
    assistantMsg.thinking = data?.thinking ?? undefined;
    assistantMsg.loading = false;
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || e?.response?.data || e?.message || String(e);
    assistantMsg.content = `❌ ${typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg)}`;
    assistantMsg.loading = false;
  } finally {
    loading.value = false;
    scrollToBottom();
  }
}

function handleClear() {
  messages.value = [];
  pendingImages.value = [];
}

function handleClose() {
  messages.value = [];
  pendingImages.value = [];
  inputText.value = "";
  thinkOn.value = false;
  thinkLevel.value = 0;
  loading.value = false;
}
</script>

<style lang="scss" scoped>
.textTestDialog {
  display: flex;
  flex-direction: column;
  height: 65vh;

  .messageList {
    flex: 1;
    overflow-y: auto;
    padding: 12px 4px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    .emptyHint {
      text-align: center;
      color: var(--td-text-color-placeholder);
      margin-top: 80px;
      font-size: 14px;
    }

    .messageItem {
      display: flex;

      &.user {
        justify-content: flex-end;
        .bubble {
          background: var(--td-brand-color);
          color: #fff;
          border-radius: 12px 12px 2px 12px;
          .role {
            color: rgba(255, 255, 255, 0.75);
          }
        }
      }

      &.assistant {
        justify-content: flex-start;
        .bubble {
          background: var(--td-bg-color-container-hover);
          border-radius: 12px 12px 12px 2px;
        }
      }

      .bubble {
        max-width: 78%;
        padding: 10px 14px;
        font-size: 14px;
        line-height: 1.6;

        .role {
          font-size: 11px;
          font-weight: 600;
          opacity: 0.6;
          margin-bottom: 4px;
        }

        .content {
          white-space: pre-wrap;
          word-break: break-word;

          .msgImages {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 6px;

            .msgImageThumb {
              max-width: 140px;
              max-height: 140px;
              border-radius: 6px;
              object-fit: cover;
              cursor: pointer;
              box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
              transition: transform 0.15s ease;

              &:hover {
                transform: scale(1.03);
              }
            }
          }

          .thinkContent {
            display: block;
            font-size: 12px;
            color: var(--td-text-color-secondary);
            background: var(--td-bg-color-secondarycontainer);
            border-left: 3px solid var(--td-brand-color-light);
            padding: 4px 8px;
            margin-bottom: 6px;
            border-radius: 0 4px 4px 0;
          }
        }

        .cursor {
          animation: blink 1s step-end infinite;
        }
      }
    }
  }

  .inputArea {
    border-top: 1px solid var(--td-component-border);
    padding-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .pendingImagesArea {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 4px 2px;

      .pendingImageItem {
        position: relative;
        width: 52px;
        height: 52px;
        border-radius: 6px;
        border: 1px solid var(--td-component-border);
        overflow: hidden;

        .thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .removeBtn {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;

          &:hover {
            background: rgba(0, 0, 0, 0.85);
          }
        }
      }
    }

    .inputActions {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .leftTools {
        display: flex;
        align-items: center;
        gap: 8px;

        .hint {
          font-size: 12px;
          color: var(--td-text-color-placeholder);
        }

        .thinkSwitch {
          display: flex;
          align-items: center;
          gap: 4px;

          .thinkLabel {
            font-size: 12px;
            color: var(--td-text-color-secondary);
          }

          .thinkLevelSelect {
            width: 96px;
          }
        }

        .uploadBtn {
          color: var(--td-text-color-secondary);
          &:hover {
            color: var(--td-brand-color);
          }
        }
      }

      .btns {
        display: flex;
        gap: 8px;
      }
    }
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>
