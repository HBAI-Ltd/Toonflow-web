<template>
  <div class="textareaWrapper">
    {{ prompt }}
    <div
      ref="editorRef"
      class="promptEditor"
      contenteditable="true"
      :data-placeholder="editorContent.length === 0 ? props.placeholder : ''"
      @input="handleInput"
      @keydown="handleKeydown"
      @blur="handleBlur"
      @mousedown.stop></div>
    <div v-if="showReferences" class="referencesPopup" :style="{ left: popupPosition.left + 'px', top: popupPosition.top + 'px' }">
      <div class="referencesList">
        <div
          v-for="(item, index) in references"
          :key="index"
          class="reference-item"
          :class="{ active: activeIndex === index }"
          @mousedown.prevent="selectReference(index)">
          <t-image v-if="item.type === 'image'" :src="item.src" fit="cover" class="ref-popup-img" />
          <i-video v-else-if="item.type === 'video'" class="ref-popup-icon" />
          <i-volume-mute v-else-if="item.type === 'audio'" class="ref-popup-icon" />
          <span class="reference-label">{{ $t("workbench.production.editImage.reference", { index: index + 1 }) }}</span>
          <span class="ref-index-badge">#{{ index + 1 }}</span>
        </div>
        <div v-if="!references?.length" class="no-references">{{ $t("workbench.production.editImage.noReferences") }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, render } from "vue";
import { Popup } from "tdesign-vue-next";
import { Video, VolumeMute } from "@icon-park/vue-next";

const props = defineProps<{
  references?: { type: "image" | "video" | "audio"; src: string }[];
  placeholder?: String;
}>();

const prompt = defineModel<string>({ default: "" });

const editorRef = ref<HTMLDivElement | null>(null);
const showReferences = ref(false);
const activeIndex = ref(0);
const popupPosition = ref({ left: 0, top: 0 });
const editorContent = ref("");

let savedRange: Range | null = null;
let internalUpdate = false;

// 创建引用标签元素
function createRefTag(index: number): HTMLSpanElement {
  const ref = props.references?.[index];
  const refType = ref?.type ?? "image";
  const refSrc = ref?.src ?? "";
  const container = document.createElement("span");
  container.contentEditable = "false";
  container.dataset.refIndex = String(index);
  container.dataset.imgSrc = refSrc;

  const popupContent = () => {
    if (refType === "image") {
      return h("img", {
        src: refSrc,
        style: { width: "200px", borderRadius: "8px", display: "block" },
        alt: "",
      });
    }
    return h("span", { style: { padding: "8px", display: "block" } }, refSrc);
  };

  const tagContent = () => {
    if (refType === "image") {
      return h("img", { src: refSrc, alt: "" });
    }
    if (refType === "video") {
      return h(Video);
    }
    return h(VolumeMute);
  };

  const vnode = h(
    Popup,
    {
      content: popupContent,
      placement: "top",
    },
    {
      default: () => [
        h("div", { class: "tag" }, [tagContent(), h("span", null, $t("workbench.production.editImage.reference", { index: index + 1 }))]),
      ],
    },
  );
  render(vnode, container);
  return container;
}

// 将 prompt 文本渲染到编辑器，处理 @图N 为标签
function renderPromptToEditor(text: string) {
  if (!editorRef.value) return;
  editorRef.value.innerHTML = "";
  const regex = /@图(\d+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      editorRef.value.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
    }
    editorRef.value.appendChild(createRefTag(Number(match[1]) - 1));
    editorRef.value.appendChild(document.createTextNode("\u200B"));
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    editorRef.value.appendChild(document.createTextNode(text.substring(lastIndex)));
  }
  editorContent.value = editorRef.value.textContent || "";
}

// 初始化编辑器内容
onMounted(() => {
  if (editorRef.value && prompt.value) {
    renderPromptToEditor(prompt.value);
  }
});

// 监听 references 变化，重新渲染标签（避免 props 数据延迟导致图片为空）
watch(
  () => props.references,
  () => {
    if (editorRef.value && prompt.value) {
      renderPromptToEditor(prompt.value);
    }
  },
);

// 监听外部 prompt 变化，同步到编辑器
watch(prompt, (newVal) => {
  if (internalUpdate) {
    internalUpdate = false;
    return;
  }
  if (!editorRef.value) return;
  const currentText = editorRef.value.textContent?.replace(/\u200B/g, "") || "";
  if (newVal !== undefined && newVal !== currentText) {
    renderPromptToEditor(newVal);
  }
});

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

function handleKeydown(e: KeyboardEvent) {
  if (!showReferences.value || !props.references?.length) return;
  const maxIndex = props.references.length - 1;
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

  const container = createRefTag(index);

  // 将 @ 及其后面输入的内容替换为标签
  // 先拆分文本节点：在 lastAt 处拆分，保留前半段
  const afterNode = textNode.splitText(lastAt);
  // afterNode 现在包含从 @ 开始的文本，删掉 @ 到光标的部分
  const charsToRemove = cursorOffset - lastAt;
  afterNode.deleteData(0, charsToRemove);

  // 在 afterNode 之前插入容器
  textNode.parentNode!.insertBefore(container, afterNode);

  // 插入零宽字符确保光标可以定位
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

function syncPrompt() {
  if (!editorRef.value) return;
  let result = "";
  editorRef.value.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += (node.textContent || "").replace(/\u200B/g, "");
    } else if ((node as HTMLElement).dataset?.refIndex !== undefined) {
      const refIndex = (node as HTMLElement).dataset.refIndex;
      result += ` @图${Number(refIndex) + 1} `;
    }
  });
  internalUpdate = true;
  prompt.value = result;
}

function handleBlur() {
  setTimeout(() => {
    showReferences.value = false;
  }, 150);
}
</script>

<style lang="scss" scoped>
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
  cursor: text;

  &:empty::before {
    content: attr(data-placeholder);
    color: #aaa;
    pointer-events: none;
  }
}

.referencesPopup {
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

  .referencesList {
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

    .ref-popup-icon {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      flex-shrink: 0;
      background: #f5f5f5;
      font-size: 18px;
      color: #666;
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

  i {
    font-size: 14px;
    flex-shrink: 0;
  }
}
</style>
