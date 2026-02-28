<template>
  <div class="themeConfig">
    <t-form label-align="top">
      <!-- 主题模式切换 -->
      <t-form-item label="主题模式（切换后建议重启）">
        <t-radio-group
          v-model="themeSetting.mode"
          variant="default-filled"
          @change="(val, ctx) => handleModeChange(val as string, ctx.e as MouseEvent)">
          <t-radio-button value="light">
            <template #label>
              <t-icon name="sunny" />
              浅色
            </template>
          </t-radio-button>
          <t-radio-button value="dark">
            <template #label>
              <t-icon name="moon" />
              深色
            </template>
          </t-radio-button>
          <t-radio-button value="auto">
            <template #label>
              <t-icon name="desktop" />
              跟随系统
            </template>
          </t-radio-button>
        </t-radio-group>
      </t-form-item>

      <!-- 主题色选择 -->
      <t-form-item label="主题色">
        <div class="colorList">
          <div
            v-for="color in themeColors"
            :key="color.value"
            class="colorItem"
            :class="{ active: themeSetting.primaryColor === color.value }"
            :style="{ backgroundColor: color.value }"
            @click="(e: MouseEvent) => handleColorChange(color.value, e)">
            <t-icon v-if="themeSetting.primaryColor === color.value" name="check" class="checkIcon" />
          </div>
          <t-color-picker
            v-model="themeSetting.primaryColor"
            format="HEX"
            :color-modes="['monochrome']"
            :show-primary-color-preview="false"
            @change="(val: string) => handleColorChange(val)">
            <template #trigger>
              <div class="colorItem customColor" :style="{ backgroundColor: isCustomColor ? themeSetting.primaryColor : '#fff' }">
                <t-icon :name="isCustomColor ? 'check' : 'edit'" :class="['customIcon', { checkIcon: isCustomColor }]" />
              </div>
            </template>
          </t-color-picker>
        </div>
      </t-form-item>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useTheme, themeSetting } from "@/utils/theme";

const { applyThemeMode, applyThemeColor, toggleThemeWithTransition } = useTheme();

// 预设主题色
const themeColors = [
  { name: "香芋紫", value: "#9810fa" },
  { name: "活力橙", value: "#ED7B2F" },
  { name: "柠檬黄", value: "#F5BA18" },
  { name: "薄荷绿", value: "#00A870" },
  { name: "青翠绿", value: "#2BA471" },
  { name: "山茶红", value: "#D54941" },
  { name: "碧空蓝", value: "#029CD4" },
];

// 判断是否为自定义颜色
const isCustomColor = computed(() => !themeColors.some((c) => c.value.toLowerCase() === themeSetting.value.primaryColor.toLowerCase()));

// 处理主题模式切换
const handleModeChange = (mode: string, event?: MouseEvent) => {
  toggleThemeWithTransition(event, () => applyThemeMode(mode));
};

// 处理主题色变更
const handleColorChange = (color: string, event?: MouseEvent) => {
  themeSetting.value.primaryColor = color;
  toggleThemeWithTransition(event, () => applyThemeColor(color));
};

// 监听主题模式变化
watch(
  () => themeSetting.value.mode,
  () => setTimeout(() => applyThemeColor(themeSetting.value.primaryColor), 0),
);
</script>

<style lang="scss" scoped>
.themeConfig {
  width: 100%;

  .colorList {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;

    .colorItem {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      border: 2px solid transparent;

      &:hover {
        transform: scale(1.1);
      }

      &.active {
        border-color: var(--td-brand-color);
        box-shadow: 0 0 0 2px rgba(0, 82, 217, 0.2);
      }

      .checkIcon {
        color: #fff;
        font-size: 16px;
      }

      &.customColor {
        border: 2px dashed var(--td-border-level-2-color);

        .customIcon {
          color: var(--td-text-color-secondary);
        }

        &:hover {
          border-color: var(--td-brand-color);
        }
      }
    }
  }
}
</style>

<!-- View Transition 全局样式 -->
<style>
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-old(root) {
  z-index: 1;
}

::view-transition-new(root) {
  z-index: 9999;
  animation: circleClip 0.5s ease-out;
}

@keyframes circleClip {
  from {
    clip-path: circle(0px at var(--x) var(--y));
  }
  to {
    clip-path: circle(var(--r) at var(--x) var(--y));
  }
}

:root[theme-mode="dark"]::view-transition-old(root) {
  z-index: 9999;
  animation: circleClipReverse 0.5s ease-out;
}

:root[theme-mode="dark"]::view-transition-new(root) {
  z-index: 1;
  animation: none;
}

@keyframes circleClipReverse {
  from {
    clip-path: circle(var(--r) at var(--x) var(--y));
  }
  to {
    clip-path: circle(0px at var(--x) var(--y));
  }
}
</style>
