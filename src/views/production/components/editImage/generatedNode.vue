<template>
  <div class="generatedNode">
    <Handle type="target" :position="Position.Left" style="z-index: 999999" />
    <div class="data" @click="selectedFn">
      <div class="title ac">
        <i-pic theme="outline" size="16" fill="#000000" />
        <span class="title-text">{{ $t('workbench.production.editImage.imageGeneration') }}</span>
      </div>
      <div class="image">
        <div v-if="generating" class="imageLoading">
          <div class="loadingSpinner"></div>
          <span class="loadingText">{{ $t('workbench.production.editImage.generating') }}</span>
        </div>
        <div v-else class="imageWrapper">
          <t-image class="image" :src="data.generatedImage" fit="cover" :class="['nodeImage', { selected }]">
            <template #overlayContent>
              <div class="imageToolsWrap">
                <ImageTools :src="data.generatedImage ?? ''" position="br" />
              </div>
            </template>
          </t-image>
        </div>
        <t-tooltip theme="primary" :content="$t('workbench.production.editImage.deleteNode')">
          <div class="remove ac" @click="removeNodes(props.id)">
            <i-delete theme="outline" size="18" fill="#fff" />
          </div>
        </t-tooltip>
      </div>
    </div>
    <div v-if="selected" class="parameter">
      <div class="image-refs f">
        <div v-for="(item, index) in data.references" :key="index" class="ref-thumb">
          <t-image :src="item.image" fit="cover" class="ref-img" />
        </div>
      </div>
      <div class="text w">
        <div class="textareaWrapper">
          <div
            ref="editorRef"
            class="promptEditor"
            contenteditable="true"
            :data-placeholder="editorContent.length === 0 ? $t('workbench.production.editImage.promptPlaceholder') : ''"
            @input="handleInput"
            @keydown="handleKeydown"
            @blur="handleBlur"
            @mousedown.stop></div>
          <div v-if="showReferences" class="references-popup" :style="{ left: popupPosition.left + 'px', top: popupPosition.top + 'px' }">
            <div class="references-list">
              <div
                v-for="(item, index) in data.references"
                :key="index"
                class="reference-item"
                :class="{ active: activeIndex === index }"
                @mousedown.prevent="selectReference(index)">
                <t-image :src="item.image" fit="cover" class="ref-popup-img" />
                <span class="reference-label">{{ $t('workbench.production.editImage.imageRef', { index: index + 1 }) }}</span>
                <span class="ref-index-badge">#{{ index + 1 }}</span>
              </div>
              <div v-if="!data.references?.length" class="no-references">{{ $t('workbench.production.editImage.noReferences') }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="operate ac jb">
        <div class="ac">
          <modelSelect v-model="data.model" type="image" size="small" />
          <t-select v-model="data.ratio" class="paramSelect ml-5" size="small" :placeholder="$t('workbench.production.editImage.ratio')">
            <t-option value="16:9" label="16:9" />
            <t-option value="9:16" label="9:16" />
            <t-option value="1:1" label="1:1" />
          </t-select>
          <t-select v-model="data.quality" class="paramSelect ml-5" size="small" :placeholder="$t('workbench.production.editImage.quality')">
            <t-option value="1K" label="1K" />
            <t-option value="2K" label="2K" />
            <t-option value="4K" label="4K" />
          </t-select>
        </div>

        <div class="f" style="gap: 5px; margin-left: 5px">
          <t-popup :content="$t('workbench.production.editImage.generateBtn')">
            <t-button theme="primary" size="small" class="generateBtn" :disabled="generating" :loading="generating" @click="handleGenerate">
              <template #icon><i-arrow-up /></template>
            </t-button>
          </t-popup>
          <t-popup :content="$t('workbench.production.save')">
            <t-button theme="primary" size="small" class="keepBtn" :disabled="generating" :loading="generating" @click="kepp">
              <template #icon><i-save /></template>
            </t-button>
          </t-popup>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, render } from "vue";
import { Handle, useVueFlow, Position } from "@vue-flow/core";
import { Popup, Tag } from "tdesign-vue-next";
import modelSelect from "@/components/modelSelect.vue";
import axios from "@/utils/axios";

const selected = ref(false);
const editorRef = ref<HTMLDivElement | null>(null);
const showReferences = ref(false);
const activeIndex = ref(0);
const popupPosition = ref({ left: 0, top: 0 });
const generating = ref(false);
const editorContent = ref("");
const emit = defineEmits(["keep"]);
const { removeNodes } = useVueFlow({ id: "editStoryboard" });

// 保存 @ 触发时的范围，用于后续替换
let savedRange: Range | null = null;

const props = defineProps<{
  id: string;
  data: {
    generatedImage?: string;
    references?: { image: string }[];
    prompt?: string;
    model?: string;
    ratio?: string;
    quality?: string;
    steps?: number;
  };
  projectId: number;
  type?: string;
}>();

function selectedFn() {
  selected.value = !selected.value;
}

// 获取光标前的文本内容
function getTextBeforeCursor(): string {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return "";

  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    return (node as Text).textContent?.substring(0, range.startOffset) ?? "";
  }
  return "";
}

// 获取弹窗位置（基于光标位置）
function getCursorPopupPosition(): { left: number; top: number } {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { left: 0, top: 24 };

  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rect = range.getBoundingClientRect();
  const editorRect = editorRef.value!.getBoundingClientRect();

  return {
    left: Math.max(0, rect.left - editorRect.left),
    top: rect.bottom - editorRect.top + 4,
  };
}

// 处理输入事件
function handleInput() {
  editorContent.value = editorRef.value?.textContent || "";
  syncPrompt();

  const text = getTextBeforeCursor();
  const lastAt = text.lastIndexOf("@");

  if (lastAt !== -1 && !text.substring(lastAt + 1).includes(" ")) {
    showReferences.value = true;
    activeIndex.value = 0;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }
    nextTick(() => {
      popupPosition.value = getCursorPopupPosition();
    });
    return;
  }

  showReferences.value = false;
  savedRange = null;
}

// 处理键盘事件
function handleKeydown(e: KeyboardEvent) {
  if (!showReferences.value || !props.data.references?.length) return;

  const maxIndex = props.data.references.length - 1;
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      activeIndex.value = Math.min(activeIndex.value + 1, maxIndex);
      break;
    case "ArrowUp":
      e.preventDefault();
      activeIndex.value = Math.max(activeIndex.value - 1, 0);
      break;
    case "Enter":
    case "Tab":
      e.preventDefault();
      selectReference(activeIndex.value);
      break;
    case "Escape":
      showReferences.value = false;
      break;
  }
}

// 选择引用 —— 将 @ 及后面的输入替换为 tag 节点
function selectReference(index: number) {
  if (!editorRef.value || !savedRange) return;

  const sel = window.getSelection();
  if (!sel) return;

  const range = savedRange.cloneRange();
  const textNode = range.startContainer as Text;
  const cursorOffset = range.startOffset;
  const fullText = textNode.textContent || "";
  const lastAt = fullText.lastIndexOf("@", cursorOffset - 1);

  if (lastAt === -1) return;

  const deleteRange = document.createRange();
  deleteRange.setStart(textNode, lastAt);
  deleteRange.setEnd(textNode, cursorOffset);
  deleteRange.deleteContents();

  const container = document.createElement("span");
  container.contentEditable = "false";
  container.dataset.refIndex = String(index);

  const imgSrc = props.data.references?.[index]?.image ?? "";
  container.dataset.imgSrc = imgSrc;

  const vnode = h(
    Popup,
    {
      content: () =>
        h("img", {
          src: imgSrc,
          style: { width: "200px", borderRadius: "8px", display: "block" },
          alt: "",
        }),
      placement: "top",
    },
    {
      default: () => [h("div", { class: "tag" }, [h("img", { src: imgSrc, alt: "" }), h("span", null, `图${index + 1}`)])],
    },
  );

  render(vnode, container);

  const insertRange = document.createRange();
  insertRange.setStart(textNode, lastAt);
  insertRange.collapse(true);
  insertRange.insertNode(container);

  const space = document.createTextNode("\u200B");
  container.after(space);

  const newRange = document.createRange();
  newRange.setStart(space, 1);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);

  showReferences.value = false;
  savedRange = null;

  editorContent.value = editorRef.value?.textContent || "";
  syncPrompt();
}

// 将编辑器内容同步回 data.prompt（纯文本，tag 转为 @图X）
function syncPrompt() {
  if (!editorRef.value) return;
  let result = "";
  editorRef.value.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      // 去掉零宽空格
      result += (node.textContent || "").replace(/\u200B/g, "");
    } else if ((node as HTMLElement).dataset?.refIndex !== undefined) {
      // container span 上有 data-ref-index，格式为 @图X
      const refIndex = (node as HTMLElement).dataset.refIndex;
      result += ` @图${Number(refIndex) + 1} `;
    }
  });
  props.data.prompt = result;
}

// 构建引用映射：{ "@图X": imageUrl }
function buildReferenceMap(): Record<string, string> {
  if (!editorRef.value) return {};
  const map: Record<string, string> = {};
  editorRef.value.childNodes.forEach((node) => {
    const el = node as HTMLElement;
    if (el.dataset?.refIndex !== undefined) {
      const alias = `@图${Number(el.dataset.refIndex) + 1}`;
      map[alias] = el.dataset.imgSrc ?? "";
    }
  });
  return map;
}

// 处理失焦
function handleBlur() {
  setTimeout(() => {
    showReferences.value = false;
  }, 150);
}

// 生成
async function handleGenerate() {
  if (!props.data.model) return window.$message.error($t("workbench.production.editImage.selectModel"));
  if (!props.data.quality) return window.$message.error($t("workbench.production.editImage.selectQuality"));
  if (!props.data.ratio) return window.$message.error($t("workbench.production.editImage.selectRatio"));

  generating.value = true;
  try {
    const referenceMap = buildReferenceMap();
    const { data } = await axios.post("/production/editImage/generateStoryboardImage", {
      model: props.data.model,
      references: referenceMap ?? {},
      quality: props.data.quality,
      ratio: props.data.ratio,
      prompt: props.data.prompt,
      projectId: props.projectId,
      type: props.type,
    });
    props.data.generatedImage = data.url;
  } catch (e) {
    return window.$message.error((e as any)?.message || $t("workbench.production.editImage.generateFailed"));
  } finally {
    generating.value = false;
  }
}
function kepp() {
  if (!props.data.generatedImage) return window.$message.error($t("workbench.production.editImage.generateFirst"));
  emit("keep", props.data.generatedImage);
}
</script>

<style lang="scss" scoped>
.generatedNode {
  width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;

  .data {
    width: 100%;
    cursor: pointer;

    .title {
      height: 30px;
      padding: 5px;

      .title-text {
        margin-left: 5px;
        color: #4b4b4b;
      }
    }

    .image {
      height: 320px;
      width: 100%;
      position: relative;
      .remove {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 9999;
        padding: 5px;
        border-radius: 10px;
        background-color: rgba(220, 50, 50, 0.7);
        cursor: pointer;
        &:hover {
          background-color: rgba(220, 50, 50, 1);
        }
      }
      .imageLoading {
        width: 100%;
        height: 100%;
        background-color: #e8e8e8;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;

        .loadingSpinner {
          width: 36px;
          height: 36px;
          border: 3px solid #d0d0d0;
          border-top-color: #5bccb3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loadingText {
          font-size: 14px;
          color: #666;
        }
      }

      .imageWrapper {
        position: relative;
        width: 100%;
        height: 100%;

        :deep(.nodeImage) {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          border: 3px solid transparent;
          box-sizing: border-box;

          &.selected {
            border-color: #000;
          }
        }
      }
      .imageToolsWrap {
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }

      &:hover {
        .imageToolsWrap {
          opacity: 1;
          pointer-events: auto;
        }
      }
    }
  }

  .parameter {
    margin-top: 10px;
    width: 500px;
    height: 200px;
    border: 1px solid #d4d4d4;
    background-color: #fff;
    border-radius: 10px;

    .image-refs {
      height: 50px;
      padding: 10px;

      .ref-thumb {
        margin-left: 8px;

        .ref-img {
          width: 45px;
          height: 45px;
          border-radius: 10px;
        }
      }
    }

    .text {
      height: 100px;
      display: flex;
      position: relative;

      .textareaWrapper {
        width: 100%;
        height: 100%;
        position: relative;
      }

      .promptEditor {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        border: none;
        outline: none;
        padding: 10px;
        overflow-y: auto;
        font-size: 13px;
        line-height: 1.6;
        color: #333;
        white-space: pre-wrap;
        word-break: break-all;
        margin-left: 5px;
        margin-top: 5px;
        margin-top: 10px;
        cursor: text;

        &:empty::before {
          content: attr(data-placeholder);
          color: #aaa;
          pointer-events: none;
        }
      }

      .references-popup {
        position: absolute;
        z-index: 99999;
        min-width: 180px;
        max-height: 220px;
        overflow-y: auto;
        background: #fff;
        border: 1px solid #e8e8e8;
        border-radius: 10px;
        box-shadow:
          0 8px 24px rgba(0, 0, 0, 0.12),
          0 2px 6px rgba(0, 0, 0, 0.06);
        backdrop-filter: blur(4px);

        .references-list {
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .reference-item {
          display: flex;
          align-items: center;
          padding: 6px 8px;
          cursor: pointer;
          border-radius: 7px;
          transition: background-color 0.15s ease;
          gap: 8px;

          &:hover {
            background-color: #f5f5f5;
          }

          &.active {
            background-color: #edfaf7;
            box-shadow: inset 0 0 0 1px rgba(91, 204, 179, 0.3);
          }

          .ref-popup-img {
            width: 38px;
            height: 38px;
            border-radius: 6px;
            flex-shrink: 0;
            border: 1px solid #efefef;
          }

          .reference-label {
            font-size: 13px;
            font-weight: 500;
            color: #333;
            flex: 1;
          }

          .ref-index-badge {
            font-size: 11px;
            color: #aaa;
            background: #f0f0f0;
            border-radius: 4px;
            padding: 1px 5px;
          }
        }

        .no-references {
          padding: 16px 12px;
          text-align: center;
          color: #bbb;
          font-size: 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;

          &::before {
            font-size: 20px;
            opacity: 0.5;
          }
        }
      }
    }

    .operate {
      padding: 10px;
      height: 50px;

      .paramSelect {
        min-width: 100px;
        width: 100px;
      }

      .ml-5 {
        margin-left: 5px;
      }

      .generateBtn {
        margin-left: auto;
        --td-brand-color: #5bccb3;
        --td-brand-color-hover: #4ab8a0;
      }
      .keepBtn {
      }
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
:deep(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 5px;
  border: 1px solid rgba(91, 204, 179, 0.5);
  background: linear-gradient(135deg, #edfaf7 0%, #f0fdfb 100%);
  padding: 1px 6px 1px 3px;
  cursor: pointer;
  vertical-align: middle;
  line-height: 1;
  transition:
    border-color 0.15s,
    background 0.15s;
  font-size: 12px;
  font-weight: 500;
  color: #2da68a;
  user-select: none;
  position: relative;
  top: -1px;
  margin-left: 5px;

  &:hover {
    border-color: #5bccb3;
    background: linear-gradient(135deg, #d8f5ef 0%, #e5faf6 100%);
  }

  img {
    width: 18px;
    height: 18px;
    border-radius: 3px;
    object-fit: cover;
    flex-shrink: 0;
    border: 1px solid rgba(91, 204, 179, 0.2);
  }
}
</style>
