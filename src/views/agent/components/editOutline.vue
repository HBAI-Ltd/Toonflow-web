<template>
  <div class="outline">
    <t-dialog
      v-model:visible="outlineShow"
      :closable="false"
      top="3vh"
      header="编辑剧情大纲"
      width="70vw"
      :maskClosable="false"
      wrapClassName="no-header-margin"
      dialogClass="custom-modal"
      :footer="true"
      @close-btn-click="handleCancel"
      @confirm="onConfirm">
      <div class="data">
        <div class="sectionCard">
          <div class="sectionHeader">
            <h3>基本信息</h3>
          </div>
          <div class="formRow">
            <div class="formItem">
              <label class="formLabel">集数</label>
              <t-input-number v-model="formData.episodeIndex" theme="normal" :min="1" placeholder="请输入集数" />
            </div>
            <div class="formItem flex-2">
              <label class="formLabel">标题</label>
              <t-input v-model="formData.title" placeholder="请输入标题" />
            </div>
          </div>
          <div class="infoTag">章节范围：第{{ formData.chapterRange[0] }}章 - 第{{ formData.chapterRange[formData.chapterRange.length - 1] }}章</div>
        </div>

        <div class="sectionCard">
          <div class="sectionHeader">
            <h3>资产关联</h3>
          </div>

          <div class="assetGroup">
            <div class="assetLabel">
              <span>场景</span>
            </div>
            <div class="assetList">
              <t-tag v-for="(scene, index) in formData.scenes" :key="index" closable @close="removeScene(index)">
                {{ scene.name }}
              </t-tag>
              <t-tag theme="primary" variant="outline" class="addTag" @click="showSceneDialog = true">
                <template #icon><i-plus theme="outline" size="14" /></template>
                添加场景
              </t-tag>
            </div>
          </div>

          <div class="assetGroup">
            <div class="assetLabel">
              <span>角色</span>
            </div>
            <div class="assetList">
              <t-tag v-for="(character, index) in formData.characters" :key="index" closable @close="removeCharacter(index)">
                {{ character.name }}
              </t-tag>
              <t-tag theme="primary" variant="outline" class="addTag" @click="showCharacterDialog = true">
                <template #icon><i-plus theme="outline" size="14" /></template>
                添加角色
              </t-tag>
            </div>
          </div>

          <div class="assetGroup">
            <div class="assetLabel">
              <span>道具</span>
            </div>
            <div class="assetList">
              <t-tag v-for="(prop, index) in formData.props" :key="index" closable @close="removeProp(index)">
                {{ prop.name }}
              </t-tag>
              <t-tag theme="primary" variant="outline" class="addTag" @click="showPropDialog = true">
                <template #icon><i-plus theme="outline" size="14" /></template>
                添加道具
              </t-tag>
            </div>
          </div>
        </div>

        <div class="sectionCard">
          <div class="sectionHeader">
            <h3>剧情设计</h3>
          </div>
          <div class="formItem">
            <label class="formLabel">开场钩子</label>
            <t-textarea v-model="formData.openingHook" placeholder="开场吸引观众的关键设定..." :autosize="{ minRows: 2, maxRows: 4 }" />
          </div>
          <div class="formItem">
            <label class="formLabel">核心冲突</label>
            <t-textarea v-model="formData.coreConflict" placeholder="本集的主要矛盾冲突..." :autosize="{ minRows: 2, maxRows: 4 }" />
          </div>
          <div class="formItem">
            <label class="formLabel">剧情大纲</label>
            <t-textarea v-model="formData.outline" placeholder="剧情发展的主线脉络..." :autosize="{ minRows: 3, maxRows: 6 }" />
          </div>
          <div class="formItem">
            <label class="formLabel">结尾悬念</label>
            <t-textarea v-model="formData.endingHook" placeholder="结尾留下的悬念或引子..." :autosize="{ minRows: 2, maxRows: 4 }" />
          </div>
        </div>

        <div class="sectionCard">
          <div class="sectionHeader">
            <h3>补充信息</h3>
          </div>
          <div class="formItem">
            <label class="formLabel">关键剧情节点</label>
            <t-tag-input v-model="keyEventsTags" clearable placeholder="输入关键剧情节点后按回车..." />
          </div>
          <div class="formItem">
            <label class="formLabel">情感曲线</label>
            <t-input v-model="formData.emotionalCurve" placeholder="例: 3(期待) → 8(背叛) → 9(爆发) → 4(余波)" />
          </div>
          <div class="formItem">
            <label class="formLabel">视觉重点</label>
            <t-tag-input v-model="visualHighlightsTags" clearable placeholder="输入视觉重点镜头后按回车..." />
          </div>
          <div class="formItem">
            <label class="formLabel">经典台词</label>
            <t-tag-input v-model="classicQuotesTags" clearable placeholder="输入经典台词后按回车..." />
          </div>
        </div>
      </div>
    </t-dialog>

    <t-dialog v-model:visible="showSceneDialog" header="添加场景" width="500px" @confirm="addScene" @close="resetSceneForm">
      <t-form :data="sceneForm" label-width="80px">
        <t-form-item label="场景名称" name="name">
          <t-input v-model="sceneForm.name" placeholder="请输入场景名称" />
        </t-form-item>
        <t-form-item label="场景描述" name="description">
          <t-textarea v-model="sceneForm.description" placeholder="请输入场景描述" :autosize="{ minRows: 3, maxRows: 6 }" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="showCharacterDialog" header="添加角色" width="500px" @confirm="addCharacter" @close="resetCharacterForm">
      <t-form :data="characterForm" label-width="80px">
        <t-form-item label="角色名称" name="name">
          <t-input v-model="characterForm.name" placeholder="请输入角色名称" />
        </t-form-item>
        <t-form-item label="角色描述" name="description">
          <t-textarea v-model="characterForm.description" placeholder="请输入角色描述" :autosize="{ minRows: 3, maxRows: 6 }" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="showPropDialog" header="添加道具" width="500px" @confirm="addProp" @close="resetPropForm">
      <t-form :data="propForm" label-width="80px">
        <t-form-item label="道具名称" name="name">
          <t-input v-model="propForm.name" placeholder="请输入道具名称" />
        </t-form-item>
        <t-form-item label="道具描述" name="description">
          <t-textarea v-model="propForm.description" placeholder="请输入道具描述" :autosize="{ minRows: 3, maxRows: 6 }" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";

interface Outline {
  episodeIndex: number;
  title: string;
  chapterRange: number[];
  scenes: { name: string; description: string }[];
  characters: { name: string; description: string }[];
  props: { name: string; description: string }[];
  coreConflict: string;
  outline: string;
  openingHook: string;
  keyEvents: string[];
  emotionalCurve: string;
  visualHighlights: string[];
  endingHook: string;
  classicQuotes: string[];
}

const props = defineProps({
  outline: {
    type: Object as () => Outline,
    required: true,
  },
});

const emit = defineEmits(["update:outline"]);

const outlineShow = defineModel({
  type: Boolean,
  default: false,
});

// 表单数据
const formData = ref<Outline>({
  episodeIndex: 0,
  title: "",
  chapterRange: [],
  scenes: [],
  characters: [],
  props: [],
  coreConflict: "",
  outline: "",
  openingHook: "",
  keyEvents: [],
  emotionalCurve: "",
  visualHighlights: [],
  endingHook: "",
  classicQuotes: [],
});

// 初始化表单数据
watch(
  () => props.outline,
  (newVal) => {
    if (newVal) {
      formData.value = JSON.parse(JSON.stringify(newVal));
    }
  },
  { immediate: true, deep: true },
);

// 关键节点标签
const keyEventsTags = computed({
  get: () => formData.value.keyEvents,
  set: (val: string[]) => {
    formData.value.keyEvents = val;
  },
});

// 视觉重点标签
const visualHighlightsTags = computed({
  get: () => formData.value.visualHighlights,
  set: (val: string[]) => {
    formData.value.visualHighlights = val;
  },
});

// 金句标签
const classicQuotesTags = computed({
  get: () => formData.value.classicQuotes,
  set: (val: string[]) => {
    formData.value.classicQuotes = val;
  },
});

// 场景相关
const showSceneDialog = ref(false);
const sceneForm = ref({ name: "", description: "" });

function addScene() {
  if (sceneForm.value.name) {
    formData.value.scenes.push({ ...sceneForm.value });
    showSceneDialog.value = false;
    resetSceneForm();
  }
}

function removeScene(index: number) {
  formData.value.scenes.splice(index, 1);
}

function resetSceneForm() {
  sceneForm.value = { name: "", description: "" };
}

// 角色相关
const showCharacterDialog = ref(false);
const characterForm = ref({ name: "", description: "" });

function addCharacter() {
  if (characterForm.value.name) {
    formData.value.characters.push({ ...characterForm.value });
    showCharacterDialog.value = false;
    resetCharacterForm();
  }
}

function removeCharacter(index: number) {
  formData.value.characters.splice(index, 1);
}

function resetCharacterForm() {
  characterForm.value = { name: "", description: "" };
}

// 道具相关
const showPropDialog = ref(false);
const propForm = ref({ name: "", description: "" });

function addProp() {
  if (propForm.value.name) {
    formData.value.props.push({ ...propForm.value });
    showPropDialog.value = false;
    resetPropForm();
  }
}

function removeProp(index: number) {
  formData.value.props.splice(index, 1);
}

function resetPropForm() {
  propForm.value = { name: "", description: "" };
}

// 对话框操作
function handleCancel() {
  outlineShow.value = false;
}

// 确认
function onConfirm() {
  emit("update:outline", formData.value);
  outlineShow.value = false;
}
</script>

<style lang="scss" scoped>
.outline {
  .data {
    max-height: 75vh;
    overflow-y: auto;
    padding-right: 10px;
    .sectionCard {
      padding: 24px;
      margin-bottom: 20px;
      border-radius: 16px;
      border: 1px solid #e7e7e7;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      &:last-child {
        margin-bottom: 0;
      }

      .sectionHeader {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 2px solid #f0f0f0;
        h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
          letter-spacing: 0.5px;
        }
      }

      .formRow {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;

        .formItem {
          flex: 1;

          &.flex-2 {
            flex: 2;
          }
        }
      }

      .formItem {
        margin-bottom: 20px;

        &:last-child {
          margin-bottom: 0;
        }

        .formLabel {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #555;
        }
      }

      .infoTag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 5px 5px;
        border-radius: 8px;
        font-size: 14px;
        border: 1px solid #d3d4d4;
        transition: all 0.3s ease;
      }

      .assetGroup {
        margin-bottom: 20px;

        &:last-child {
          margin-bottom: 0;
        }

        .assetLabel {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 14px;
          font-weight: 500;
          color: #555;
        }
      }

      .assetList {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 8px;
        min-height: 48px;
        transition: background 0.3s ease;

        &:hover {
          background: #f0f2f5;
        }

        .addTag {
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;

          &:hover {
            transform: translateY(-2px) scale(1.05);
            border-color: #0052d9;
            color: #0052d9;
            box-shadow: 0 4px 12px rgba(0, 82, 217, 0.2);
          }

          &:active {
            transform: translateY(0) scale(0.98);
          }
        }
      }
    }
  }
}
</style>
