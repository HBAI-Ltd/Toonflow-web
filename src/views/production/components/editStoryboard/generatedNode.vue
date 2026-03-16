<template>
  <div class="generatedNode">
    <Handle type="target" :position="Position.Left" />
    <div class="data" @click="selectedFn">
      <div class="title ac">
        <i-pic theme="outline" size="16" fill="#000000" />
        <span style="margin-left: 5px; color: #4b4b4b">图片生成</span>
      </div>
      <div class="image">
        <div v-if="generating" class="imageLoading">
          <div class="loadingSpinner"></div>
          <span class="loadingText">生成中...</span>
        </div>
        <t-image
          v-else
          :src="data.generatedImage"
          fit="cover"
          :style="{
            width: '100%',
            height: '100%',
            borderRadius: '10px',
            border: selected ? '3px solid #000' : '3px solid transparent',
            boxSizing: 'border-box',
          }" />
      </div>
    </div>
    <div class="parameter" v-if="selected">
      <div class="iamge">
        <t-image :src="data.generatedImage" fit="cover" :style="{ width: '45px', height: '45px', borderRadius: '10px' }" />
      </div>
      <div class="text w">
        <div class="textarea-wrapper">
          <t-textarea
            ref="textareaRef"
            class="promptTextarea"
            v-model="data.prompt"
            placeholder="描述任何你想要生成的内容，按@引用素材"
            name="description"
            @input="handleInput"
            @keydown="handleKeydown"
            @blur="handleBlur"
            :autosize="{ minRows: 4, maxRows: 4 }" />
          <!-- 选择器弹窗 -->
          <div v-if="showReferences" class="references-popup" :style="{ left: popupPosition.left + 'px', top: popupPosition.top + 'px' }">
            <div class="references-list">
              <div
                class="reference-item"
                v-for="(item, index) in data.references"
                :key="index"
                :class="{ active: activeIndex === index }"
                @mousedown.prevent="selectReference(index)">
                <t-image :src="item.image" fit="cover" :style="{ width: '36px', height: '36px', borderRadius: '6px' }" />
                <span class="reference-label">图{{ index + 1 }}</span>
              </div>
              <div v-if="!data.references?.length" class="no-references">暂无可引用的图片</div>
            </div>
          </div>
        </div>
      </div>
      <div class="operate ac">
        <t-select v-model="data.model" class="paramSelect" size="small" placeholder="模型">
          <t-option value="banana-pro" label="Banana Pro" />
          <t-option value="other" label="Other" />
        </t-select>
        <t-select v-model="data.ratio" class="paramSelect" size="small" placeholder="比例" style="margin-left: 5px">
          <t-option value="16:9" label="16:9" />
          <t-option value="9:16" label="9:16" />
          <t-option value="1:1" label="1:1" />
        </t-select>
        <t-select v-model="data.quality" class="paramSelect" size="small" placeholder="质量" style="margin-left: 5px">
          <t-option value="1K" label="1K" />
          <t-option value="2K" label="2K" />
        </t-select>
        <t-button theme="primary" size="small" class="generateBtn" :disabled="generating" :loading="generating" @click="handleGenerate">
          <template #icon><i-arrow-up /></template>
        </t-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

const selected = ref(false);
const textareaRef = ref<any>(null);
const showReferences = ref(false);
const activeIndex = ref(0);
const popupPosition = ref({ left: 0, top: 0 });
const atStartIndex = ref(-1); // 记录@符号的位置
const generating = ref(false); // 生成中状态

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
}>();

function selectedFn() {
  selected.value = !selected.value;
}

// 获取光标位置并计算弹窗位置
function getCursorPosition() {
  const textarea = textareaRef.value?.$el?.querySelector("textarea");
  if (!textarea) return { left: 0, top: 24 };

  const { selectionStart } = textarea;
  const textBeforeCursor = textarea.value.substring(0, selectionStart);

  // 创建一个隐藏的元素来计算光标位置
  const mirror = document.createElement("div");
  const style = window.getComputedStyle(textarea);

  mirror.style.cssText = `
    position: absolute;
    visibility: hidden;
    white-space: pre-wrap;
    word-wrap: break-word;
    width: ${style.width};
    font-size: ${style.fontSize};
    font-family: ${style.fontFamily};
    line-height: ${style.lineHeight};
    padding: ${style.padding};
  `;

  mirror.textContent = textBeforeCursor;
  const span = document.createElement("span");
  span.textContent = "|";
  mirror.appendChild(span);

  document.body.appendChild(mirror);
  const spanRect = span.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();

  const left = spanRect.left - mirrorRect.left;
  const top = spanRect.top - mirrorRect.top + parseInt(style.lineHeight);

  document.body.removeChild(mirror);

  return { left: Math.max(0, left), top: Math.min(top, 80) };
}

// 处理输入事件
function handleInput() {
  const textarea = textareaRef.value?.$el?.querySelector("textarea");
  if (!textarea) return;

  // 直接从 textarea 元素获取实时值，而不是从 props.data.prompt
  const value = textarea.value || "";
  const { selectionStart } = textarea;
  const textBeforeCursor = value.substring(0, selectionStart);

  // 检查是否刚输入了@
  const lastAtIndex = textBeforeCursor.lastIndexOf("@");

  if (lastAtIndex !== -1) {
    // 检查@后面是否有空格或已完成的引用
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    // 如果@后面没有空格且不是已完成的"图X"格式，显示选择器
    if (!textAfterAt.includes(" ") && !/^图\d+$/.test(textAfterAt)) {
      showReferences.value = true;
      atStartIndex.value = lastAtIndex;
      activeIndex.value = 0;
      nextTick(() => {
        popupPosition.value = getCursorPosition();
      });
      return;
    }
  }

  showReferences.value = false;
  atStartIndex.value = -1;
}

// 处理键盘事件
function handleKeydown(e: any) {
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

// 选择引用
function selectReference(index: number) {
  const textarea = textareaRef.value?.$el?.querySelector("textarea");
  if (!textarea || atStartIndex.value === -1) return;

  const currentValue = props.data.prompt || "";
  const cursorPos = textarea.selectionStart;

  // 替换@及其后面的内容为"图X"
  const beforeAt = currentValue.substring(0, atStartIndex.value);
  const afterCursor = currentValue.substring(cursorPos);

  const insertText = `图${index + 1} `;
  props.data.prompt = beforeAt + "@" + insertText + afterCursor;

  showReferences.value = false;
  atStartIndex.value = -1;

  // 恢复光标位置
  nextTick(() => {
    const newCursorPos = atStartIndex.value + 1 + insertText.length + 1;
    textarea.focus();
    textarea.setSelectionRange(beforeAt.length + 1 + insertText.length, beforeAt.length + 1 + insertText.length);
  });
}

// 处理失焦
function handleBlur() {
  // 延迟关闭，让点击事件有时间触发
  setTimeout(() => {
    showReferences.value = false;
  }, 150);
}

// 生成
function handleGenerate() {
  if (generating.value) return;
  
  generating.value = true;
  // TODO: 这里调用实际的生成API
  setTimeout(() => {
    generating.value = false;
    // 生成完成后更新图片
    // props.data.generatedImage = '新图片地址';
  }, 3000);
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
    }
    .image {
      height: 320px;
      width: 100%;

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
    }
  }

  .parameter {
    margin-top: 10px;
    width: 500px;
    height: 200px;
    border: 1px solid #d4d4d4;
    background-color: #fff;
    border-radius: 10px;
    .iamge {
      height: 50px;
      padding: 10px;
      margin-left: 8px;
    }
    .text {
      height: 100px;
      display: flex;
      position: relative;

      .textarea-wrapper {
        width: 100%;
        height: 100%;
        position: relative;
      }

      .promptTextarea {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        border: none;
        outline: none;
        padding: 10px;
        resize: none;
        background: transparent;
        :deep(.t-textarea__inner) {
          border: none;
          box-shadow: none;
        }
      }

      .references-popup {
        position: absolute;
        z-index: 99999;
        min-width: 160px;
        max-height: 200px;
        overflow-y: auto;
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

        .references-list {
          padding: 4px 0;
        }

        .reference-item {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.2s;
          .reference-label {
            margin-left: 10px;
            font-size: 14px;
            font-weight: 500;
            color: #333;
          }
        }

        .no-references {
          padding: 12px;
          text-align: center;
          color: #999;
          font-size: 13px;
        }
      }
    }

    .operate {
      padding: 10px;
      height: 50px;
      .paramSelect {
        width: 100px;
      }
      .generateBtn {
        margin-left: auto;
        --td-brand-color: #5bccb3;
        --td-brand-color-hover: #4ab8a0;
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
</style>
