<template>
  <div class="languageConfig">
    <p class="section-desc">选择界面显示语言</p>
    <div class="lang-grid">
      <div
        v-for="item in language"
        :key="item.value"
        class="lang-card"
        :class="{ active: selectedLang === item.value }"
        @click="selectLang(item.value)">
        <div class="lang-info">
          <div class="lang-name">{{ item.name }}</div>
          <div class="lang-native">{{ item.nativeName }}</div>
        </div>
        <t-icon v-if="selectedLang === item.value" name="check-circle-filled" class="check-icon" />
      </div>
    </div>
    <t-alert class="tip-alert" theme="info" message="语言切换后将在下次启动时完全生效" :close="false" />
  </div>
</template>

<script setup lang="ts">
import settingStore from "@/stores/setting";
const store = settingStore();
const { themeSetting } = storeToRefs(store);

const language = ref([
  {
    name: "中文",
    nativeName: "Chinese (Simplified)",
    value: "zh-CN",
  },
  // {
  //   name: "英文",
  //   nativeName: "English",
  //   value: "en-US",
  // },
]);

const selectedLang = ref<string>(store.language ?? "zh-CN");

function selectLang(val: string) {
  selectedLang.value = val;
  store.language = val;
  window.$message?.success("语言设置已保存");
}
</script>

<style lang="scss" scoped>
.languageConfig {
  width: 100%;

  .section-desc {
    font-size: 13px;
    margin-bottom: 16px;
  }

  .lang-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    max-width: 520px;
  }

  .lang-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border: 1.5px solid #b7b9bb;
    border-radius: 8px;
    cursor: pointer;
    position: relative;
    transition: all 0.2s;

    &:hover {
      border-color: #dadcdd;
      background: #e0e1e2;
    }

    &.active {
      border-color: #b7b9bb;
    }

    .lang-info {
      flex: 1;
      min-width: 0;

      .lang-name {
        font-size: 14px;
        font-weight: 600;
      }

      .lang-native {
        font-size: 12px;
        margin-top: 2px;
      }
    }

    .check-icon {
      font-size: 18px;
      flex-shrink: 0;
    }
  }

  .tip-alert {
    margin-top: 20px;
    max-width: 520px;
  }
}
</style>
