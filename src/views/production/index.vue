<template>
  <VueFlow
    class="flowMain"
    :nodes="nodes"
    :edges="edges"
    :max-zoom="10"
    :min-zoom="0.1"
    fit-view-on-init
    :selection-key-code="null"
    :multi-selection-key-code="null">
    <template #node-script="props">
      <scriptNode :id="props.id" :data="props.data" />
    </template>
    <template #node-storyboardTable="props">
      <storyboardTable :id="props.id" :data="props.data" />
    </template>
    <template #node-assets="props">
      <assets :id="props.id" :data="props.data" />
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
      <div class="episodesSelect">
        <t-select v-model="episodesId" placeholder="-请选择-" autoWidth :options="episodesOptions" filterable>
          <template #label>
            <i-document-folder size="24" />
          </template>
        </t-select>
      </div>
      <div class="openRightChatBoxBtn c" v-show="!openShowVisible" @click.stop="openShowVisible = true">
        <i-menu-unfold-one theme="outline" size="24" fill="#000000" />
      </div>
      <transition name="slide" v-show="openShowVisible">
        <rightChatBox :title="rightChatTitle" @close="openShowVisible = false" :episodesId />
      </transition>
    </div>
  </VueFlow>
  <t-guide v-model="current" :steps="steps" @finish="finishGuide" />
</template>

<script setup lang="ts">
import { useLocalStorage } from "@vueuse/core";
import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
//子node组件
import scriptNode from "./node/script.vue";
import assets from "./node/assets.vue";
import storyboardTable from "./node/storyboardTable.vue";
import storyboard from "./node/storyboard.vue";
import workbench from "./node/workbench.vue";
import poster from "./node/poster.vue";
//悬浮窗组件
import rightChatBox from "./components/rightChatBox/index.vue";

import { useFlowBuilder } from "./utils/flowBuilder";

const { viewport } = useVueFlow();

const openShowVisible = ref(true);

const episodesId = ref(1);

const rightChatTitle = computed(() => {
  const episode = episodesOptions.value.find((option) => option.value === episodesId.value);
  return episode ? episode.label : "";
});

const episodesOptions = ref([
  { label: "第1集：真相大白，背叛之心", value: 1 },
  { label: "第2集：123123123", value: 2 },
  { label: "第3集：12313123123", value: 3 },
]);

// ==================== AI 操作数据区 ====================
// AI 只需修改此对象即可控制整个故事线流程
const flowData = ref({
  // 剧本
  script: {
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
    groups: [
      {
        name: "第一幕",
        items: [
          {
            id: 1,
            scene: "大殿内景",
            description: "凌玄跪在地上，面色苍白，嘴角带血",
            camera: "中景，缓慢推近",
            duration: "4s",
            frameMode: "首",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄", "苏晚卿"],
          },
          {
            id: 2,
            scene: "苏晚卿特写",
            description: "冷笑的面容，眼神中满是算计",
            camera: "特写，浅景深",
            duration: "3s",
            frameMode: "首",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
          {
            id: 3,
            scene: "青云令",
            description: "令牌在苏晚卿手中，表面光芒黯淡",
            camera: "微距特写",
            duration: "2s",
            frameMode: "首",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
          {
            id: 4,
            scene: "回忆闪回",
            description: "黑风岭妖兽袭击，凌玄护住苏晚卿",
            camera: "快速剪辑，手持晃动",
            duration: "5s",
            frameMode: "首尾",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
          {
            id: 5,
            scene: "凌玄反应",
            description: "瞳孔骤缩，难以置信的表情",
            camera: "眼部特写推至大特写",
            duration: "3s",
            frameMode: "首",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
          {
            id: 6,
            scene: "吐血",
            description: "鲜血喷出，滴落在青石板上",
            camera: "慢动作，跟随血滴",
            duration: "4s",
            frameMode: "首",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
        ],
      },
      {
        name: "第二幕",
        items: [
          {
            id: 1,
            scene: "血迹特写",
            description: "鲜血在青石上晕开，形成刺目的红",
            camera: "俯拍，缓慢拉远",
            duration: "3s",
            frameMode: "首尾",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
          {
            id: 2,
            scene: "凌玄嘶吼",
            description: "愤怒到极致的表情，青筋暴起",
            camera: "仰拍，增加压迫感",
            duration: "4s",
            frameMode: "首尾",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
          {
            id: 3,
            scene: "苏晚卿讥讽",
            description: "轻蔑的笑容，毫无愧疚",
            camera: "中景，冷色调",
            duration: "3s",
            frameMode: "首",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
          {
            id: 4,
            scene: "长老群像",
            description: "三位长老面面相觑，随即附和",
            camera: "横移，依次扫过",
            duration: "5s",
            frameMode: "首",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
          {
            id: 5,
            scene: "沈清辞得意",
            description: "搂着苏晚卿，志得意满的笑",
            camera: "双人中景",
            duration: "3s",
            frameMode: "首",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
        ],
      },
      {
        name: "第三幕",
        items: [
          {
            id: 1,
            scene: "血迹特写",
            description: "鲜血在青石上晕开，形成刺目的红",
            camera: "俯拍，缓慢拉远",
            duration: "3s",
            frameMode: "首",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
          {
            id: 2,
            scene: "凌玄嘶吼",
            description: "愤怒到极致的表情，青筋暴起",
            camera: "仰拍，增加压迫感",
            duration: "4s",
            frameMode: "首",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
          {
            id: 3,
            scene: "苏晚卿讥讽",
            description: "轻蔑的笑容，毫无愧疚",
            camera: "中景，冷色调",
            duration: "3s",
            frameMode: "首",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
          {
            id: 4,
            scene: "长老群像",
            description: "三位长老面面相觑，随即附和",
            camera: "横移，依次扫过",
            duration: "5s",
            frameMode: "首",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
          {
            id: 5,
            scene: "沈清辞得意",
            description: "搂着苏晚卿，志得意满的笑",
            camera: "双人中景",
            duration: "3s",
            frameMode: "首",
            mooPurpose: "地狱感建立",
            luck: "缓慢推进-被捣药声节奏吸入",
            firstFrameDescribe: "溶洞洞口，石壁渗水，火把跳动，前景残缺人影模糊，李火旺背影远处，暗橙+焦褐",
            endFrameDescription: "推近后背影占50%高度，压迫感加重",
            linesSoundEffects: "[音效】捣药声沉闷",
            assets: ["凌玄"],
          },
        ],
      },
    ],
  },
  // 分镜（合并为一个 node）
  storyboard: {
    groups: [
      {
        frames: [
          { id: 1, itemId: 1, description: "大殿全景，凌玄跪地，面色苍白", frameType: "首帧", image: "https://picsum.photos/seed/sb1-1/600/360" },
          { id: 2, itemId: 2, description: "苏晚卿冷笑特写，眼神算计", frameType: "首帧", image: "https://picsum.photos/seed/sb1-2/600/360" },
          { id: 3, itemId: 3, description: "青云令微距，表面光芒黯淡", frameType: "首帧", image: "https://picsum.photos/seed/sb1-3/600/360" },
          { id: 4, itemId: 4, description: "黑风岭妖兽来袭，暗橙焦褐色调", frameType: "首帧", image: "https://picsum.photos/seed/sb1-4/600/360" },
          { id: 5, itemId: 4, description: "凌玄护住苏晚卿，背影占画面50%", frameType: "尾帧", image: "https://picsum.photos/seed/sb1-5/600/360" },
          { id: 6, itemId: 5, description: "凌玄瞳孔骤缩，难以置信", frameType: "首帧", image: "https://picsum.photos/seed/sb1-6/600/360" },
          { id: 7, itemId: 6, description: "鲜血喷出，滴落青石板", frameType: "首帧", image: "https://picsum.photos/seed/sb1-7/600/360" },
        ],
      },
      {
        frames: [
          { id: 1, itemId: 1, description: "鲜血在青石上开始晕开", frameType: "首帧", image: "https://picsum.photos/seed/sb2-1/600/360" },
          { id: 2, itemId: 1, description: "血迹蔓延形成刺目红色", frameType: "尾帧", image: "https://picsum.photos/seed/sb2-2/600/360" },
          { id: 3, itemId: 2, description: "凌玄愤怒表情，仰拍", frameType: "首帧", image: "https://picsum.photos/seed/sb2-3/600/360" },
          { id: 4, itemId: 2, description: "青筋暴起，极致压迫感", frameType: "尾帧", image: "https://picsum.photos/seed/sb2-4/600/360" },
          { id: 5, itemId: 3, description: "苏晚卿讥讽，轻蔑笑容", frameType: "首帧", image: "https://picsum.photos/seed/sb2-5/600/360" },
          { id: 6, itemId: 4, description: "长老群像，面面相觑", frameType: "首帧", image: "https://picsum.photos/seed/sb2-6/600/360" },
          { id: 7, itemId: 5, description: "沈清辞搂苏晚卿，志得意满", frameType: "首帧", image: "https://picsum.photos/seed/sb2-7/600/360" },
        ],
      },
      {
        frames: [
          { id: 1, itemId: 1, description: "血迹特写，俯拍拉远", frameType: "首帧", image: "https://picsum.photos/seed/sb3-1/600/360" },
          { id: 2, itemId: 2, description: "凌玄愤怒，青筋暴起", frameType: "首帧", image: "https://picsum.photos/seed/sb3-2/600/360" },
          { id: 3, itemId: 3, description: "苏晚卿轻蔑笑容", frameType: "首帧", image: "https://picsum.photos/seed/sb3-3/600/360" },
          { id: 4, itemId: 4, description: "长老群像横移扫过", frameType: "首帧", image: "https://picsum.photos/seed/sb3-4/600/360" },
          { id: 5, itemId: 5, description: "沈清辞得意双人中景", frameType: "首帧", image: "https://picsum.photos/seed/sb3-5/600/360" },
        ],
      },
    ],
  },
  // 工作台（单个 node）
  workbench: {
    name: "第2集 - 真相大白",
    duration: "01:03",
    resolution: "1920×1080",
    fps: "30fps",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  // 封面（单个 node）
  poster: {
    items: [
      { id: 1, image: "https://picsum.photos/seed/1/600/360" },
      { id: 2, image: "https://picsum.photos/seed/2/600/360" },
      { id: 3, image: "https://picsum.photos/seed/3/600/360" },
      { id: 4, image: "https://picsum.photos/seed/4/600/360" },
    ],
  },
});
// ==================== AI 操作数据区结束 ====================

// 节点位置（独立于 AI 数据，由用户拖拽控制）
const nodePositions = ref<Record<string, { x: number; y: number }>>({
  script: { x: 10, y: 0 },
  assets: { x: -70, y: 1400 },
  storyboardTable: { x: 620, y: 0 },
  storyboard: { x: 1500, y: 24 },
  workbench: { x: 2100, y: 24 },
  poster: { x: 2500, y: 24 },
});

// 自动构建 nodes 和 edges
const { nodes, edges } = useFlowBuilder(flowData, nodePositions);

const current = useLocalStorage("productionGuideCurrent", 0);
const steps = [
  {
    element: ".episodesSelect",
    title: "切换集数",
    body: "切换集数挪移到这里了哦",
    placement: "bottom",
  },
] as any;
function finishGuide() {
  current.value = -1;
}
</script>
<style lang="scss" scoped>
.flowMain {
  height: 100%;
  .floatingWindow {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    .episodesSelect {
      position: absolute;
      top: 10px;
      left: 0px;
      z-index: 9999;
      cursor: pointer;
    }
    .openRightChatBoxBtn {
      position: absolute;
      top: 10px;
      right: 0;
      width: 40px;
      height: 40px;
      background-color: #ecedef;
      border-radius: 10px;
      z-index: 10;
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
