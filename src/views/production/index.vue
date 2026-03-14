<template>
  <VueFlow class="flowMain" :nodes="nodes" :edges="edges" :min-zoom="0.01" fit-view-on-init :selection-key-code="null" :multi-selection-key-code="null">
    <template #node-script="props">
      <scriptNode :id="props.id" :data="props.data" />
    </template>
    <template #node-storyboardTable="props">
      <storyboardTable :id="props.id" :data="props.data" />
    </template>
    <template #node-assets="props">
      <asserts :id="props.id" :data="props.data" />
    </template>
    <template #node-storyboard="props">
      <storyboard :id="props.id" :data="props.data" />
    </template>
    <template #node-workbench="props">
      <workbench :id="props.id" :data="props.data" />
    </template>
    <template #node-poster="props">
      <poster :id="props.id" :data="props.data" />
    </template>
    <Background></Background>
    <Controls />
    <div class="floatingWindow">
      <div class="openBtn c" v-if="!openShowVisible && !isLeaving">
        <i-menu-unfold-one
          theme="outline"
          size="24"
          fill="#000000"
          @click="
            () => {
              openShowVisible = true;
            }
          " />
      </div>
      <transition name="slide" @before-leave="isLeaving = true" @after-leave="isLeaving = false">
        <dialogue v-if="openShowVisible" v-model="openShowVisible" />
      </transition>
    </div>
  </VueFlow>
</template>

<script setup lang="ts">
import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
//子node组件
import scriptNode from "./node/script.vue";
import asserts from "./node/assets.vue";
import storyboardTable from "./node/storyboardTable.vue";
import storyboard from "./node/storyboard.vue";
import workbench from "./node/workbench.vue";
import poster from "./node/poster.vue";
//悬浮窗组件
import dialogue from "./components/dialogue.vue";

import { useFlowBuilder } from "./utils/flowBuilder";

const { viewport } = useVueFlow();
const openShowVisible = ref(false);
const isLeaving = ref(false);

onMounted(() => {});

// ==================== AI 操作数据区 ====================
// AI 只需修改此对象即可控制整个故事线流程
const flowData = ref({
  // 剧本
  script: {
    id: "script-1",
    position: { x: 10, y: 0 },
    connectTo: "storyboard-table",
    blocks: [
      {
        id: "b1",
        content: `# 第2集：真相大白，背叛之心
※ 青云宗，宗门大殿
△ 凌玄心脏猛地一缩，瞳孔骤缩
苏晚卿冷笑：「还有你当宝贝的青云令」
「若不是我趁你养伤时，偷偷在令牌上动了手脚」
「让你没法引动令牌力量，我们怎么能这么容易逼你交出来？」
△ 凌玄盯着她，声音在抖：「你什么意思？」
苏晚卿语气平静，像在说别人的事
「当年是我故意把妖兽引去黑风岭，又假装被困」
「让你不得不为了救我，硬接妖兽三道致命攻击」
「清辞当时修炼遇到瓶颈，需要你的青云宗本源灵力」
「可你修为太高，只有让你重伤废修，他才能取走本源」
「至于青云令，我早就用秘法削弱了令牌和你的感应」
「你以为你还能靠这令牌反抗？」
△ 凌玄气血逆流，再次一口鲜血喷出`,
      },
      {
        id: "b2",
        content: `【特效】鲜血在青石上晕开刺目的红
「苏晚卿！！！」
「我待你掏心掏肺，你为什么要这么害我？」
「连我视若性命的青云令，你都要算计！」
△ 苏晚卿像是听到大笑话
「清辞才是真心对我，他能给我想要的大道」
「而你只会让我困在这宗门里，做个有名无实的夫人！」
△ 几个以前受过凌玄恩惠的长老突然开口
长老甲：「凌玄，识时务者为俊杰！」
长老乙：「你现在修为全废，青云令也没用了」
长老丙：「早就不配管青云宗，不如乖乖交出令牌，还能保住一条命！」`,
      },
      {
        id: "b3",
        content: `△ 凌玄看着这些人，心里凉得厉害
△ 沈清辞搂住苏晚卿的腰，笑得更加嚣张
「听到了吗？现在宗门上下都站在我们这边」
「你识相点，就现在把青云令交出来」
「要是敢反抗，我就废了你最后一点修为」
「把你扔去妖兽谷，让你尝尝被妖兽分食的滋味！」
△ 凌玄浑身颤抖，眼中血丝密布
△ 指着苏晚卿，指尖疯狂颤抖
【独白】她的真面目...我全看清楚了
【卡黑】`,
      },
    ],
  },
  // 资产
  assets: {
    id: "assets-1",
    position: { x: -70, y: 1400 },
    characters: [
      { name: "凌玄", desc: "男主 · 青云宗宗主 · 重伤废修", bgColor: "#e0f2fe" },
      { name: "苏晚卿", desc: "女配 · 凌玄未婚妻 · 背叛者", bgColor: "#ffe4e6" },
      { name: "沈清辞", desc: "反派 · 夺舍者 · 苏晚卿真爱", bgColor: "#fef08a" },
      { name: "长老甲", desc: "配角 · 墙头草 · 见风使舵", bgColor: "#e0e7ff" },
    ],
    scenes: [
      { name: "青云宗大殿", desc: "主场景 · 庄严肃穆 · 冷色调", bgColor: "#d1fae5" },
      { name: "黑风岭", desc: "回忆场景 · 阴森危险", bgColor: "#7b91b5" },
      { name: "妖兽谷", desc: "威胁场景 · 凶险之地", bgColor: "#fca5a5" },
    ],
  },
  // 分镜表（合并为一个 node）
  storyboardTable: {
    id: "storyboard-table",
    position: { x: 804, y: 0 },
    connectTo: "storyboard",
    groups: [
      {
        id: "st-1",
        name: "第一幕",
        blockId: "b1",
        items: [
          { id: 1, scene: "大殿内景", description: "凌玄跪在地上，面色苍白，嘴角带血", camera: "中景，缓慢推近", duration: "4s" },
          { id: 2, scene: "苏晚卿特写", description: "冷笑的面容，眼神中满是算计", camera: "特写，浅景深", duration: "3s" },
          { id: 3, scene: "青云令", description: "令牌在苏晚卿手中，表面光芒黯淡", camera: "微距特写", duration: "2s" },
          { id: 4, scene: "回忆闪回", description: "黑风岭妖兽袭击，凌玄护住苏晚卿", camera: "快速剪辑，手持晃动", duration: "5s" },
          { id: 5, scene: "凌玄反应", description: "瞳孔骤缩，难以置信的表情", camera: "眼部特写推至大特写", duration: "3s" },
          { id: 6, scene: "吐血", description: "鲜血喷出，滴落在青石板上", camera: "慢动作，跟随血滴", duration: "4s" },
        ],
      },
      {
        id: "st-2",
        name: "第二幕",
        blockId: "b2",
        items: [
          { id: 1, scene: "血迹特写", description: "鲜血在青石上晕开，形成刺目的红", camera: "俯拍，缓慢拉远", duration: "3s" },
          { id: 2, scene: "凌玄嘶吼", description: "愤怒到极致的表情，青筋暴起", camera: "仰拍，增加压迫感", duration: "4s" },
          { id: 3, scene: "苏晚卿讥讽", description: "轻蔑的笑容，毫无愧疚", camera: "中景，冷色调", duration: "3s" },
          { id: 4, scene: "长老群像", description: "三位长老面面相觑，随即附和", camera: "横移，依次扫过", duration: "5s" },
          { id: 5, scene: "沈清辞得意", description: "搂着苏晚卿，志得意满的笑", camera: "双人中景", duration: "3s" },
        ],
      },
      {
        id: "st-3",
        name: "第三幕",
        blockId: "b3",
        items: [
          { id: 1, scene: "血迹特写", description: "鲜血在青石上晕开，形成刺目的红", camera: "俯拍，缓慢拉远", duration: "3s" },
          { id: 2, scene: "凌玄嘶吼", description: "愤怒到极致的表情，青筋暴起", camera: "仰拍，增加压迫感", duration: "4s" },
          { id: 3, scene: "苏晚卿讥讽", description: "轻蔑的笑容，毫无愧疚", camera: "中景，冷色调", duration: "3s" },
          { id: 4, scene: "长老群像", description: "三位长老面面相觑，随即附和", camera: "横移，依次扫过", duration: "5s" },
          { id: 5, scene: "沈清辞得意", description: "搂着苏晚卿，志得意满的笑", camera: "双人中景", duration: "3s" },
        ],
      },
    ],
  },
  // 分镜（合并为一个 node）
  storyboard: {
    id: "storyboard",
    position: { x: 1500, y: 24 },
    connectTo: "workbench",
    groups: [
      {
        id: "sb-1",
        name: "第一幕",
        frames: [
          { id: 1, description: "大殿全景，庄严肃穆" },
          { id: 2, description: "凌玄跪地特写" },
          { id: 3, description: "苏晚卿冷笑" },
          { id: 4, description: "青云令微距" },
          { id: 5, description: "黑风岭闪回" },
          { id: 6, description: "妖兽袭击" },
          { id: 7, description: "凌玄瞳孔骤缩" },
          { id: 8, description: "鲜血滴落" },
        ],
      },
      {
        id: "sb-2",
        name: "第二幕",
        frames: [
          { id: 1, description: "血迹晕开" },
          { id: 2, description: "凌玄嘶吼" },
          { id: 3, description: "苏晚卿讥讽" },
          { id: 4, description: "长老甲附和" },
          { id: 5, description: "长老乙劝降" },
          { id: 6, description: "沈清辞得意" },
        ],
      },
      {
        id: "sb-3",
        name: "第三幕",
        frames: [
          { id: 1, description: "凌玄颤抖" },
          { id: 2, description: "沈清辞威胁" },
          { id: 3, description: "众人逼迫" },
          { id: 4, description: "凌玄血丝密布" },
          { id: 5, description: "指向苏晚卿" },
          { id: 6, description: "独白浮现" },
          { id: 7, description: "真面目揭示" },
          { id: 8, description: "画面卡黑" },
        ],
      },
    ],
  },
  // 工作台（单个 node）
  workbench: {
    id: "workbench",
    position: { x: 2100, y: 24 },
    connectTo: "poster",
    name: "第2集 - 真相大白",
    status: "渲染中",
    duration: "01:03",
    resolution: "1920×1080",
    fps: "30fps",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  // 封面（单个 node）
  poster: {
    id: "poster",
    position: { x: 2500, y: 24 },
    items: [
      { id: 1, name: "封面方案A", size: "1080×1920", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", selected: true },
      { id: 2, name: "封面方案B", size: "1080×1920", gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
      { id: 3, name: "封面方案C", size: "1080×1920", gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
      { id: 4, name: "封面方案D", size: "1080×1920", gradient: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)" },
    ],
  },
});
// ==================== AI 操作数据区结束 ====================

// 自动构建 nodes 和 edges
const { nodes, edges } = useFlowBuilder(flowData);
</script>
<style lang="scss" scoped>
.flowMain {
  height: 100%;
  .floatingWindow {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    .openBtn {
      position: absolute;
      top: 10px;
      right: 0;
      z-index: 9999;
      width: 40px;
      height: 40px;
      background-color: #ecedef;
      border-radius: 10px;
      cursor: pointer;
    }
  }
  :deep(.slide-enter-active),
  :deep(.slide-leave-active) {
    transition: transform 0.3s ease-out;
  }
  :deep(.slide-enter-from) {
    transform: translateX(100%);
  }
  :deep(.slide-leave-to) {
    transform: translateX(100%);
  }
}
$handelSize: 12px;

:deep(.source) {
  height: $handelSize;
  width: $handelSize;
}
:deep(.target) {
  height: $handelSize;
  width: $handelSize;
}
</style>
