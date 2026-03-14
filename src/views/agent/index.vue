<template>
  <div class="agent">
    <div class="data f">
      <div class="operate">
        <div class="box">
          <agent v-model="openShowVisible" :chatList="chatList" @sendData="handleSendData" />
        </div>
      </div>
      <div class="data">
        <div class="title jb ac"></div>
        <div class="tabsWrapper" :class="{ 'has-bottom': options === 2 }">
          <t-tabs v-model="options" :addable="options == 2" @add="addOutline">
            <t-tab-panel :value="1" label="故事线">
              <div class="storyLine">
                <div class="storyLineCard" v-if="isEditingStoryLine">
                  <div class="cardHeader">
                    <div class="headerLeft">
                      <div class="headerInfo">
                        <h3 class="cardTitle">编辑故事线</h3>
                        <p class="cardSubtitle">Story Line Editing</p>
                      </div>
                    </div>
                    <div class="headerRight">
                      <div class="statsGroup">
                        <div class="statItem">
                          <span class="statValue">{{ storyLine.length }}</span>
                          <span class="statLabel">/5000 字</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="textareaWrapper">
                    <t-textarea v-model="storyLine" placeholder="在此输入你的故事线内容..." class="storylineTextarea" :maxlength="5000" />
                  </div>
                  <div class="footerActions">
                    <div class="actionButtons">
                      <t-button variant="outline" @click="cancelEditStoryLine">取消</t-button>
                      <t-button theme="primary" @click="saveStoryLine">保存故事线</t-button>
                    </div>
                  </div>
                </div>
                <div class="storyLineCard viewMode" v-else-if="storyLine">
                  <div class="cardHeader">
                    <div class="headerLeft">
                      <div class="headerInfo">
                        <h3 class="cardTitle">故事线内容</h3>
                        <p class="cardSubtitle">Story Line</p>
                      </div>
                    </div>
                    <div class="headerRight">
                      <t-button variant="outline" size="medium" @click="startEditStoryLine">
                        <template #icon><i-edit theme="outline" size="18" /></template>
                        编辑故事线
                      </t-button>
                    </div>
                  </div>
                  <div class="contentDisplay">
                    <div class="storyContent">
                      {{ storyLine }}
                    </div>
                  </div>
                </div>
                <div class="storyLineEmpty" v-else>
                  <div class="emptyIcon">
                    <i-file-text theme="outline" size="80" fill="#c9cdd4" />
                  </div>
                  <h3 class="emptyTitle">暂无故事线</h3>
                  <p class="emptyDesc">开始创作你的故事，让角色和情节在此展开</p>
                  <t-button theme="primary" size="large" @click="startEditStoryLine">
                    <template #icon><i-edit theme="outline" size="20" /></template>
                    开始创作
                  </t-button>
                </div>
              </div>
            </t-tab-panel>
            <t-tab-panel :value="2" label="大纲">
              <div class="outline f w">
                <div v-for="(item, index) in outlineData" :key="index" class="cardWrapper" @click="editOutlineFn(item)">
                  <t-card bordered hover-shadow class="episodeCard">
                    <div class="deleteBtn" @click.stop="handleDelete(item)">
                      <i-delete theme="outline" size="18" fill="#d0021b" />
                    </div>
                    <div class="cardHeader">
                      <div class="sortBadge">Ep.{{ String(index + 1).padStart(2, "0") }}</div>
                      <div class="titleText">{{ item.title }}</div>
                    </div>
                    <div class="charactersSection">
                      <t-tag shape="round" variant="light" v-for="(figure, figureIndex) in item.characters" :key="figureIndex">
                        {{ figure.name }}
                      </t-tag>
                    </div>
                    <div class="contentSection">
                      <div class="sectionItem">
                        <div class="sectionLabel">
                          <span>核心冲突</span>
                        </div>
                        <div class="sectionContent">{{ item.coreConflict }}</div>
                      </div>
                      <div class="sectionItem">
                        <div class="sectionLabel">
                          <span>黄金3秒</span>
                        </div>
                        <div class="sectionContent">{{ item.openingHook }}</div>
                      </div>
                    </div>
                  </t-card>
                </div>
              </div>
            </t-tab-panel>
          </t-tabs>
        </div>
        <div class="bottom ac" v-show="options == 2">
          <span style="color: #666666">Agent：</span>
          <span>大纲师</span>
          <t-divider layout="vertical" />
          <span style="color: #666666">进度：</span>
          <span>3/{{ outlineData.length }}集</span>
          <t-divider layout="vertical" />
          <span style="color: #666666">耗时：</span>
          <span>2m 15s</span>
        </div>
      </div>
    </div>
    <editOutline v-model="outlineShow" :outline="selectedOutline" @update:outline="handleOutlineUpdate" />
  </div>
</template>

<script setup lang="ts">
import agent from "@/components/agent/index.vue";
import editOutline from "./components/editOutline.vue";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());

const openShowVisible = ref(true);

//类型
interface ChatList {
  role: string;
  content: string;
  identity?: string[];
}
//agent聊天记录
const chatList = ref<ChatList[]>([
  {
    role: "user",
    content: "你好，请介绍一下你自己。",
  },
  {
    role: "assistant",
    identity: ["大纲师", "情节设计师"],
    content:
      "你好！我是一个智能助手，专门为你提供帮助和解答问题。无论你有什么疑问或者需要什么帮助，我都会尽力为你提供准确和有用的信息。请随时告诉我你需要什么帮助！",
  },
]);
//发送
function handleSendData(data: string) {
  console.log("发送的数据：", data);
}

const options = ref(1);

//删除卡片
function handleDelete(item: any) {
  const index = outlineData.value.findIndex((data) => data === item);
  if (index !== -1) {
    outlineData.value.splice(index, 1);
  }
}
//大纲数据类型
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
//大纲数据
const outlineData = ref<Outline[]>([
  {
    episodeIndex: 1,
    title: "谁谋害了林白？",
    chapterRange: [1],
    scenes: [
      {
        name: "林家演武场",
        description:
          "广阔的演武场，三面是高大的石墙，中央设有武魂台，环绕着族人席位。苍穹下夕阳西下，光线斜洒，映出仪式区的庄严气氛。石柱刻满古朴纹路，周围悬挂赤色旗帜。空气中混杂着药材与汗水的气息，偶尔传来嘲笑和议论声。",
      },
      {
        name: "林白家宅院",
        description: "老宅院，青砖灰瓦，院内狭窄，房间陈设简单，一张旧木床靠墙，桌上药碗冒着热气。窗外景色黯淡，院外有低沉脚步声徘徊，氛围压抑沉闷。",
      },
      {
        name: "家族议事堂",
        description:
          "议事堂高天花板，中心摆放长案，墙上悬挂族谱和武魂图鉴。冷白灯光下，长老们围坐，一丝不苟，室内肃穆，空气中隐约弥漫冷漠与权谋的气息。",
      },
    ],
    characters: [
      {
        name: "林白",
        description:
          "十八岁青年，清秀挺拔，眉目坚毅，黑发披肩，身穿蓝白色练功服，腰佩玉带。眼神曾柔和，逐渐变得血红愤怒，气质由自信阳光转为落魄凄凉。",
      },
      {
        name: "林紫儿",
        description: "十七岁少女，容貌明艳，长发如瀑，肌肤细腻，衣着华丽红裙，戴金饰。最初温柔亲昵，后眼神冷冽，笑容狡黠转为狠厉，渗透权欲野心。",
      },
      {
        name: "林泰岳",
        description: "五旬老者，身穿紫袍，身形高大威严，满脸皱纹，眉尖锐利。举止不怒自威，气场强势，眼神精明锋利，语气冷酷决断。",
      },
      {
        name: "林跃",
        description: "六旬老人，面容沧桑，头发花白，衣着朴素灰衣。动作缓慢，眼神关切，身姿微驼。语气慈爱温和，气质悲悯。",
      },
      {
        name: "林杰",
        description: "青年男子，二十岁，紫衣华服，眉目阴狠，步伐霸道，语气嘲讽，身形健硕。表情冷漠，气质傲慢嚣张。",
      },
    ],
    props: [
      {
        name: "武魂台",
        description: "石质材质，中央刻有繁复图案，表面赤光流转。台面光滑，有微微裂痕，周边布满家族印记。仪式专用。",
      },
      {
        name: "养魂丹药瓶",
        description: "青瓷瓶，表面有云纹和朱红色家族印记。瓶身微磨损，瓶口贴有封印纸，瓶底有林家徽章。",
      },
      {
        name: "族谱卷轴",
        description: "粗布卷轴，铜色包边，表面手工绘制武魂世系图。卷轴端头略磨损，内页有手写注记。",
      },
      {
        name: "汤药碗",
        description: "陶瓷湛蓝药碗，碗沿有银灰色裂纹，表面留有药渍，碗中汤药颜色浓烈，散发淡淡草药香气。",
      },
      {
        name: "林白佩剑",
        description: "黑铁长剑，剑身有旧划痕，剑柄缀以红色丝线。剑鞘灰黑，贴有林家标志。",
      },
    ],
    coreConflict: "林白渴望觉醒顶级武魂，林紫儿通过秘法暗算并夺取灵魂力量，致林白身败名裂。",
    outline:
      "林家一年一度的武魂觉醒仪式上，林白信心满怀准备觉醒顶级武魂并向林紫儿许下终身承诺。林紫儿却突然靠近，以温柔的外表施展秘法，夺取林白灵魂力量，露出真实面目和野心。林泰岳现身，合谋助林紫儿达成目的。林紫儿觉醒天级五品武魂，全场震惊。林白虚弱登台，只觉醒黄级一品武魂，成为家族笑柄并被废除少主之位。林紫儿建议将林白父亲留下的修行资源据为己有，长老团默许。林白愤怒揭露真相却被驱逐祖宅，林杰强行赶人，林白与三叔无依无靠。林白暗下决心复仇，残余温情与信任尽数破碎，家族背后权谋浮现。",
    openingHook: "林白自信满怀走上武魂台，周围族人目光期待，夕阳下仪式肃穆。",
    keyEvents: [
      "林白满怀期待，向林紫儿许诺美好未来，走上武魂台",
      "林紫儿靠近施秘法夺取林白灵魂力量，露出野心，林泰岳合谋",
      "林紫儿觉醒天级五品武魂，林白被废少主之位，资源遭夺",
      "林白愤怒揭露真相，被驱逐祖宅，林杰强行赶人，林白决心复仇",
    ],
    emotionalCurve: "3(期待)→8(背叛)→9(羞辱爆发)→4(复仇余波)",
    visualHighlights: [
      "林白自信走上武魂台，族人期待目光",
      "林紫儿狡黠靠近，手掌按在林白腹部，灵魂力量被吸走",
      "林泰岳重踹林白，林紫儿觉醒天级五品武魂，光芒映全场",
      "林白登台只觉醒黄级一品，族人嘲笑，林紫儿得意",
      "林白被逐祖宅，三叔搀扶离开，林白落寞目送",
    ],
    endingHook: "林白回望祖宅，暗下决心：有朝一日必亲手夺回一切。",
    classicQuotes: ["林紫儿：你的灵魂力量，成全我吧！", "林白：你们这对贼父女不得好死！"],
  },
  {
    episodeIndex: 1,
    title: "谁谋害了林白？",
    chapterRange: [1],
    scenes: [
      {
        name: "林家演武场",
        description:
          "广阔的演武场，三面是高大的石墙，中央设有武魂台，环绕着族人席位。苍穹下夕阳西下，光线斜洒，映出仪式区的庄严气氛。石柱刻满古朴纹路，周围悬挂赤色旗帜。空气中混杂着药材与汗水的气息，偶尔传来嘲笑和议论声。",
      },
      {
        name: "林白家宅院",
        description: "老宅院，青砖灰瓦，院内狭窄，房间陈设简单，一张旧木床靠墙，桌上药碗冒着热气。窗外景色黯淡，院外有低沉脚步声徘徊，氛围压抑沉闷。",
      },
      {
        name: "家族议事堂",
        description:
          "议事堂高天花板，中心摆放长案，墙上悬挂族谱和武魂图鉴。冷白灯光下，长老们围坐，一丝不苟，室内肃穆，空气中隐约弥漫冷漠与权谋的气息。",
      },
    ],
    characters: [
      {
        name: "林白",
        description:
          "十八岁青年，清秀挺拔，眉目坚毅，黑发披肩，身穿蓝白色练功服，腰佩玉带。眼神曾柔和，逐渐变得血红愤怒，气质由自信阳光转为落魄凄凉。",
      },
      {
        name: "林紫儿",
        description: "十七岁少女，容貌明艳，长发如瀑，肌肤细腻，衣着华丽红裙，戴金饰。最初温柔亲昵，后眼神冷冽，笑容狡黠转为狠厉，渗透权欲野心。",
      },
      {
        name: "林泰岳",
        description: "五旬老者，身穿紫袍，身形高大威严，满脸皱纹，眉尖锐利。举止不怒自威，气场强势，眼神精明锋利，语气冷酷决断。",
      },
      {
        name: "林跃",
        description: "六旬老人，面容沧桑，头发花白，衣着朴素灰衣。动作缓慢，眼神关切，身姿微驼。语气慈爱温和，气质悲悯。",
      },
      {
        name: "林杰",
        description: "青年男子，二十岁，紫衣华服，眉目阴狠，步伐霸道，语气嘲讽，身形健硕。表情冷漠，气质傲慢嚣张。",
      },
    ],
    props: [
      {
        name: "武魂台",
        description: "石质材质，中央刻有繁复图案，表面赤光流转。台面光滑，有微微裂痕，周边布满家族印记。仪式专用。",
      },
      {
        name: "养魂丹药瓶",
        description: "青瓷瓶，表面有云纹和朱红色家族印记。瓶身微磨损，瓶口贴有封印纸，瓶底有林家徽章。",
      },
      {
        name: "族谱卷轴",
        description: "粗布卷轴，铜色包边，表面手工绘制武魂世系图。卷轴端头略磨损，内页有手写注记。",
      },
      {
        name: "汤药碗",
        description: "陶瓷湛蓝药碗，碗沿有银灰色裂纹，表面留有药渍，碗中汤药颜色浓烈，散发淡淡草药香气。",
      },
      {
        name: "林白佩剑",
        description: "黑铁长剑，剑身有旧划痕，剑柄缀以红色丝线。剑鞘灰黑，贴有林家标志。",
      },
    ],
    coreConflict: "林白渴望觉醒顶级武魂，林紫儿通过秘法暗算并夺取灵魂力量，致林白身败名裂。",
    outline:
      "林家一年一度的武魂觉醒仪式上，林白信心满怀准备觉醒顶级武魂并向林紫儿许下终身承诺。林紫儿却突然靠近，以温柔的外表施展秘法，夺取林白灵魂力量，露出真实面目和野心。林泰岳现身，合谋助林紫儿达成目的。林紫儿觉醒天级五品武魂，全场震惊。林白虚弱登台，只觉醒黄级一品武魂，成为家族笑柄并被废除少主之位。林紫儿建议将林白父亲留下的修行资源据为己有，长老团默许。林白愤怒揭露真相却被驱逐祖宅，林杰强行赶人，林白与三叔无依无靠。林白暗下决心复仇，残余温情与信任尽数破碎，家族背后权谋浮现。",
    openingHook: "林白自信满怀走上武魂台，周围族人目光期待，夕阳下仪式肃穆。",
    keyEvents: [
      "林白满怀期待，向林紫儿许诺美好未来，走上武魂台",
      "林紫儿靠近施秘法夺取林白灵魂力量，露出野心，林泰岳合谋",
      "林紫儿觉醒天级五品武魂，林白被废少主之位，资源遭夺",
      "林白愤怒揭露真相，被驱逐祖宅，林杰强行赶人，林白决心复仇",
    ],
    emotionalCurve: "3(期待)→8(背叛)→9(羞辱爆发)→4(复仇余波)",
    visualHighlights: [
      "林白自信走上武魂台，族人期待目光",
      "林紫儿狡黠靠近，手掌按在林白腹部，灵魂力量被吸走",
      "林泰岳重踹林白，林紫儿觉醒天级五品武魂，光芒映全场",
      "林白登台只觉醒黄级一品，族人嘲笑，林紫儿得意",
      "林白被逐祖宅，三叔搀扶离开，林白落寞目送",
    ],
    endingHook: "林白回望祖宅，暗下决心：有朝一日必亲手夺回一切。",
    classicQuotes: ["林紫儿：你的灵魂力量，成全我吧！", "林白：你们这对贼父女不得好死！"],
  },
  {
    episodeIndex: 1,
    title: "谁谋害了林白？",
    chapterRange: [1],
    scenes: [
      {
        name: "林家演武场",
        description:
          "广阔的演武场，三面是高大的石墙，中央设有武魂台，环绕着族人席位。苍穹下夕阳西下，光线斜洒，映出仪式区的庄严气氛。石柱刻满古朴纹路，周围悬挂赤色旗帜。空气中混杂着药材与汗水的气息，偶尔传来嘲笑和议论声。",
      },
      {
        name: "林白家宅院",
        description: "老宅院，青砖灰瓦，院内狭窄，房间陈设简单，一张旧木床靠墙，桌上药碗冒着热气。窗外景色黯淡，院外有低沉脚步声徘徊，氛围压抑沉闷。",
      },
      {
        name: "家族议事堂",
        description:
          "议事堂高天花板，中心摆放长案，墙上悬挂族谱和武魂图鉴。冷白灯光下，长老们围坐，一丝不苟，室内肃穆，空气中隐约弥漫冷漠与权谋的气息。",
      },
    ],
    characters: [
      {
        name: "林白",
        description:
          "十八岁青年，清秀挺拔，眉目坚毅，黑发披肩，身穿蓝白色练功服，腰佩玉带。眼神曾柔和，逐渐变得血红愤怒，气质由自信阳光转为落魄凄凉。",
      },
      {
        name: "林紫儿",
        description: "十七岁少女，容貌明艳，长发如瀑，肌肤细腻，衣着华丽红裙，戴金饰。最初温柔亲昵，后眼神冷冽，笑容狡黠转为狠厉，渗透权欲野心。",
      },
      {
        name: "林泰岳",
        description: "五旬老者，身穿紫袍，身形高大威严，满脸皱纹，眉尖锐利。举止不怒自威，气场强势，眼神精明锋利，语气冷酷决断。",
      },
      {
        name: "林跃",
        description: "六旬老人，面容沧桑，头发花白，衣着朴素灰衣。动作缓慢，眼神关切，身姿微驼。语气慈爱温和，气质悲悯。",
      },
      {
        name: "林杰",
        description: "青年男子，二十岁，紫衣华服，眉目阴狠，步伐霸道，语气嘲讽，身形健硕。表情冷漠，气质傲慢嚣张。",
      },
    ],
    props: [
      {
        name: "武魂台",
        description: "石质材质，中央刻有繁复图案，表面赤光流转。台面光滑，有微微裂痕，周边布满家族印记。仪式专用。",
      },
      {
        name: "养魂丹药瓶",
        description: "青瓷瓶，表面有云纹和朱红色家族印记。瓶身微磨损，瓶口贴有封印纸，瓶底有林家徽章。",
      },
      {
        name: "族谱卷轴",
        description: "粗布卷轴，铜色包边，表面手工绘制武魂世系图。卷轴端头略磨损，内页有手写注记。",
      },
      {
        name: "汤药碗",
        description: "陶瓷湛蓝药碗，碗沿有银灰色裂纹，表面留有药渍，碗中汤药颜色浓烈，散发淡淡草药香气。",
      },
      {
        name: "林白佩剑",
        description: "黑铁长剑，剑身有旧划痕，剑柄缀以红色丝线。剑鞘灰黑，贴有林家标志。",
      },
    ],
    coreConflict: "林白渴望觉醒顶级武魂，林紫儿通过秘法暗算并夺取灵魂力量，致林白身败名裂。",
    outline:
      "林家一年一度的武魂觉醒仪式上，林白信心满怀准备觉醒顶级武魂并向林紫儿许下终身承诺。林紫儿却突然靠近，以温柔的外表施展秘法，夺取林白灵魂力量，露出真实面目和野心。林泰岳现身，合谋助林紫儿达成目的。林紫儿觉醒天级五品武魂，全场震惊。林白虚弱登台，只觉醒黄级一品武魂，成为家族笑柄并被废除少主之位。林紫儿建议将林白父亲留下的修行资源据为己有，长老团默许。林白愤怒揭露真相却被驱逐祖宅，林杰强行赶人，林白与三叔无依无靠。林白暗下决心复仇，残余温情与信任尽数破碎，家族背后权谋浮现。",
    openingHook: "林白自信满怀走上武魂台，周围族人目光期待，夕阳下仪式肃穆。",
    keyEvents: [
      "林白满怀期待，向林紫儿许诺美好未来，走上武魂台",
      "林紫儿靠近施秘法夺取林白灵魂力量，露出野心，林泰岳合谋",
      "林紫儿觉醒天级五品武魂，林白被废少主之位，资源遭夺",
      "林白愤怒揭露真相，被驱逐祖宅，林杰强行赶人，林白决心复仇",
    ],
    emotionalCurve: "3(期待)→8(背叛)→9(羞辱爆发)→4(复仇余波)",
    visualHighlights: [
      "林白自信走上武魂台，族人期待目光",
      "林紫儿狡黠靠近，手掌按在林白腹部，灵魂力量被吸走",
      "林泰岳重踹林白，林紫儿觉醒天级五品武魂，光芒映全场",
      "林白登台只觉醒黄级一品，族人嘲笑，林紫儿得意",
      "林白被逐祖宅，三叔搀扶离开，林白落寞目送",
    ],
    endingHook: "林白回望祖宅，暗下决心：有朝一日必亲手夺回一切。",
    classicQuotes: ["林紫儿：你的灵魂力量，成全我吧！", "林白：你们这对贼父女不得好死！"],
  },
  {
    episodeIndex: 1,
    title: "谁谋害了林白？",
    chapterRange: [1],
    scenes: [
      {
        name: "林家演武场",
        description:
          "广阔的演武场，三面是高大的石墙，中央设有武魂台，环绕着族人席位。苍穹下夕阳西下，光线斜洒，映出仪式区的庄严气氛。石柱刻满古朴纹路，周围悬挂赤色旗帜。空气中混杂着药材与汗水的气息，偶尔传来嘲笑和议论声。",
      },
      {
        name: "林白家宅院",
        description: "老宅院，青砖灰瓦，院内狭窄，房间陈设简单，一张旧木床靠墙，桌上药碗冒着热气。窗外景色黯淡，院外有低沉脚步声徘徊，氛围压抑沉闷。",
      },
      {
        name: "家族议事堂",
        description:
          "议事堂高天花板，中心摆放长案，墙上悬挂族谱和武魂图鉴。冷白灯光下，长老们围坐，一丝不苟，室内肃穆，空气中隐约弥漫冷漠与权谋的气息。",
      },
    ],
    characters: [
      {
        name: "林白",
        description:
          "十八岁青年，清秀挺拔，眉目坚毅，黑发披肩，身穿蓝白色练功服，腰佩玉带。眼神曾柔和，逐渐变得血红愤怒，气质由自信阳光转为落魄凄凉。",
      },
      {
        name: "林紫儿",
        description: "十七岁少女，容貌明艳，长发如瀑，肌肤细腻，衣着华丽红裙，戴金饰。最初温柔亲昵，后眼神冷冽，笑容狡黠转为狠厉，渗透权欲野心。",
      },
      {
        name: "林泰岳",
        description: "五旬老者，身穿紫袍，身形高大威严，满脸皱纹，眉尖锐利。举止不怒自威，气场强势，眼神精明锋利，语气冷酷决断。",
      },
      {
        name: "林跃",
        description: "六旬老人，面容沧桑，头发花白，衣着朴素灰衣。动作缓慢，眼神关切，身姿微驼。语气慈爱温和，气质悲悯。",
      },
      {
        name: "林杰",
        description: "青年男子，二十岁，紫衣华服，眉目阴狠，步伐霸道，语气嘲讽，身形健硕。表情冷漠，气质傲慢嚣张。",
      },
    ],
    props: [
      {
        name: "武魂台",
        description: "石质材质，中央刻有繁复图案，表面赤光流转。台面光滑，有微微裂痕，周边布满家族印记。仪式专用。",
      },
      {
        name: "养魂丹药瓶",
        description: "青瓷瓶，表面有云纹和朱红色家族印记。瓶身微磨损，瓶口贴有封印纸，瓶底有林家徽章。",
      },
      {
        name: "族谱卷轴",
        description: "粗布卷轴，铜色包边，表面手工绘制武魂世系图。卷轴端头略磨损，内页有手写注记。",
      },
      {
        name: "汤药碗",
        description: "陶瓷湛蓝药碗，碗沿有银灰色裂纹，表面留有药渍，碗中汤药颜色浓烈，散发淡淡草药香气。",
      },
      {
        name: "林白佩剑",
        description: "黑铁长剑，剑身有旧划痕，剑柄缀以红色丝线。剑鞘灰黑，贴有林家标志。",
      },
    ],
    coreConflict: "林白渴望觉醒顶级武魂，林紫儿通过秘法暗算并夺取灵魂力量，致林白身败名裂。",
    outline:
      "林家一年一度的武魂觉醒仪式上，林白信心满怀准备觉醒顶级武魂并向林紫儿许下终身承诺。林紫儿却突然靠近，以温柔的外表施展秘法，夺取林白灵魂力量，露出真实面目和野心。林泰岳现身，合谋助林紫儿达成目的。林紫儿觉醒天级五品武魂，全场震惊。林白虚弱登台，只觉醒黄级一品武魂，成为家族笑柄并被废除少主之位。林紫儿建议将林白父亲留下的修行资源据为己有，长老团默许。林白愤怒揭露真相却被驱逐祖宅，林杰强行赶人，林白与三叔无依无靠。林白暗下决心复仇，残余温情与信任尽数破碎，家族背后权谋浮现。",
    openingHook: "林白自信满怀走上武魂台，周围族人目光期待，夕阳下仪式肃穆。",
    keyEvents: [
      "林白满怀期待，向林紫儿许诺美好未来，走上武魂台",
      "林紫儿靠近施秘法夺取林白灵魂力量，露出野心，林泰岳合谋",
      "林紫儿觉醒天级五品武魂，林白被废少主之位，资源遭夺",
      "林白愤怒揭露真相，被驱逐祖宅，林杰强行赶人，林白决心复仇",
    ],
    emotionalCurve: "3(期待)→8(背叛)→9(羞辱爆发)→4(复仇余波)",
    visualHighlights: [
      "林白自信走上武魂台，族人期待目光",
      "林紫儿狡黠靠近，手掌按在林白腹部，灵魂力量被吸走",
      "林泰岳重踹林白，林紫儿觉醒天级五品武魂，光芒映全场",
      "林白登台只觉醒黄级一品，族人嘲笑，林紫儿得意",
      "林白被逐祖宅，三叔搀扶离开，林白落寞目送",
    ],
    endingHook: "林白回望祖宅，暗下决心：有朝一日必亲手夺回一切。",
    classicQuotes: ["林紫儿：你的灵魂力量，成全我吧！", "林白：你们这对贼父女不得好死！"],
  },
  {
    episodeIndex: 1,
    title: "谁谋害了林白？",
    chapterRange: [1],
    scenes: [
      {
        name: "林家演武场",
        description:
          "广阔的演武场，三面是高大的石墙，中央设有武魂台，环绕着族人席位。苍穹下夕阳西下，光线斜洒，映出仪式区的庄严气氛。石柱刻满古朴纹路，周围悬挂赤色旗帜。空气中混杂着药材与汗水的气息，偶尔传来嘲笑和议论声。",
      },
      {
        name: "林白家宅院",
        description: "老宅院，青砖灰瓦，院内狭窄，房间陈设简单，一张旧木床靠墙，桌上药碗冒着热气。窗外景色黯淡，院外有低沉脚步声徘徊，氛围压抑沉闷。",
      },
      {
        name: "家族议事堂",
        description:
          "议事堂高天花板，中心摆放长案，墙上悬挂族谱和武魂图鉴。冷白灯光下，长老们围坐，一丝不苟，室内肃穆，空气中隐约弥漫冷漠与权谋的气息。",
      },
    ],
    characters: [
      {
        name: "林白",
        description:
          "十八岁青年，清秀挺拔，眉目坚毅，黑发披肩，身穿蓝白色练功服，腰佩玉带。眼神曾柔和，逐渐变得血红愤怒，气质由自信阳光转为落魄凄凉。",
      },
      {
        name: "林紫儿",
        description: "十七岁少女，容貌明艳，长发如瀑，肌肤细腻，衣着华丽红裙，戴金饰。最初温柔亲昵，后眼神冷冽，笑容狡黠转为狠厉，渗透权欲野心。",
      },
      {
        name: "林泰岳",
        description: "五旬老者，身穿紫袍，身形高大威严，满脸皱纹，眉尖锐利。举止不怒自威，气场强势，眼神精明锋利，语气冷酷决断。",
      },
      {
        name: "林跃",
        description: "六旬老人，面容沧桑，头发花白，衣着朴素灰衣。动作缓慢，眼神关切，身姿微驼。语气慈爱温和，气质悲悯。",
      },
      {
        name: "林杰",
        description: "青年男子，二十岁，紫衣华服，眉目阴狠，步伐霸道，语气嘲讽，身形健硕。表情冷漠，气质傲慢嚣张。",
      },
    ],
    props: [
      {
        name: "武魂台",
        description: "石质材质，中央刻有繁复图案，表面赤光流转。台面光滑，有微微裂痕，周边布满家族印记。仪式专用。",
      },
      {
        name: "养魂丹药瓶",
        description: "青瓷瓶，表面有云纹和朱红色家族印记。瓶身微磨损，瓶口贴有封印纸，瓶底有林家徽章。",
      },
      {
        name: "族谱卷轴",
        description: "粗布卷轴，铜色包边，表面手工绘制武魂世系图。卷轴端头略磨损，内页有手写注记。",
      },
      {
        name: "汤药碗",
        description: "陶瓷湛蓝药碗，碗沿有银灰色裂纹，表面留有药渍，碗中汤药颜色浓烈，散发淡淡草药香气。",
      },
      {
        name: "林白佩剑",
        description: "黑铁长剑，剑身有旧划痕，剑柄缀以红色丝线。剑鞘灰黑，贴有林家标志。",
      },
    ],
    coreConflict: "林白渴望觉醒顶级武魂，林紫儿通过秘法暗算并夺取灵魂力量，致林白身败名裂。",
    outline:
      "林家一年一度的武魂觉醒仪式上，林白信心满怀准备觉醒顶级武魂并向林紫儿许下终身承诺。林紫儿却突然靠近，以温柔的外表施展秘法，夺取林白灵魂力量，露出真实面目和野心。林泰岳现身，合谋助林紫儿达成目的。林紫儿觉醒天级五品武魂，全场震惊。林白虚弱登台，只觉醒黄级一品武魂，成为家族笑柄并被废除少主之位。林紫儿建议将林白父亲留下的修行资源据为己有，长老团默许。林白愤怒揭露真相却被驱逐祖宅，林杰强行赶人，林白与三叔无依无靠。林白暗下决心复仇，残余温情与信任尽数破碎，家族背后权谋浮现。",
    openingHook: "林白自信满怀走上武魂台，周围族人目光期待，夕阳下仪式肃穆。",
    keyEvents: [
      "林白满怀期待，向林紫儿许诺美好未来，走上武魂台",
      "林紫儿靠近施秘法夺取林白灵魂力量，露出野心，林泰岳合谋",
      "林紫儿觉醒天级五品武魂，林白被废少主之位，资源遭夺",
      "林白愤怒揭露真相，被驱逐祖宅，林杰强行赶人，林白决心复仇",
    ],
    emotionalCurve: "3(期待)→8(背叛)→9(羞辱爆发)→4(复仇余波)",
    visualHighlights: [
      "林白自信走上武魂台，族人期待目光",
      "林紫儿狡黠靠近，手掌按在林白腹部，灵魂力量被吸走",
      "林泰岳重踹林白，林紫儿觉醒天级五品武魂，光芒映全场",
      "林白登台只觉醒黄级一品，族人嘲笑，林紫儿得意",
      "林白被逐祖宅，三叔搀扶离开，林白落寞目送",
    ],
    endingHook: "林白回望祖宅，暗下决心：有朝一日必亲手夺回一切。",
    classicQuotes: ["林紫儿：你的灵魂力量，成全我吧！", "林白：你们这对贼父女不得好死！"],
  },
  {
    episodeIndex: 1,
    title: "谁谋害了林白？",
    chapterRange: [1],
    scenes: [
      {
        name: "林家演武场",
        description:
          "广阔的演武场，三面是高大的石墙，中央设有武魂台，环绕着族人席位。苍穹下夕阳西下，光线斜洒，映出仪式区的庄严气氛。石柱刻满古朴纹路，周围悬挂赤色旗帜。空气中混杂着药材与汗水的气息，偶尔传来嘲笑和议论声。",
      },
      {
        name: "林白家宅院",
        description: "老宅院，青砖灰瓦，院内狭窄，房间陈设简单，一张旧木床靠墙，桌上药碗冒着热气。窗外景色黯淡，院外有低沉脚步声徘徊，氛围压抑沉闷。",
      },
      {
        name: "家族议事堂",
        description:
          "议事堂高天花板，中心摆放长案，墙上悬挂族谱和武魂图鉴。冷白灯光下，长老们围坐，一丝不苟，室内肃穆，空气中隐约弥漫冷漠与权谋的气息。",
      },
    ],
    characters: [
      {
        name: "林白",
        description:
          "十八岁青年，清秀挺拔，眉目坚毅，黑发披肩，身穿蓝白色练功服，腰佩玉带。眼神曾柔和，逐渐变得血红愤怒，气质由自信阳光转为落魄凄凉。",
      },
      {
        name: "林紫儿",
        description: "十七岁少女，容貌明艳，长发如瀑，肌肤细腻，衣着华丽红裙，戴金饰。最初温柔亲昵，后眼神冷冽，笑容狡黠转为狠厉，渗透权欲野心。",
      },
      {
        name: "林泰岳",
        description: "五旬老者，身穿紫袍，身形高大威严，满脸皱纹，眉尖锐利。举止不怒自威，气场强势，眼神精明锋利，语气冷酷决断。",
      },
      {
        name: "林跃",
        description: "六旬老人，面容沧桑，头发花白，衣着朴素灰衣。动作缓慢，眼神关切，身姿微驼。语气慈爱温和，气质悲悯。",
      },
      {
        name: "林杰",
        description: "青年男子，二十岁，紫衣华服，眉目阴狠，步伐霸道，语气嘲讽，身形健硕。表情冷漠，气质傲慢嚣张。",
      },
    ],
    props: [
      {
        name: "武魂台",
        description: "石质材质，中央刻有繁复图案，表面赤光流转。台面光滑，有微微裂痕，周边布满家族印记。仪式专用。",
      },
      {
        name: "养魂丹药瓶",
        description: "青瓷瓶，表面有云纹和朱红色家族印记。瓶身微磨损，瓶口贴有封印纸，瓶底有林家徽章。",
      },
      {
        name: "族谱卷轴",
        description: "粗布卷轴，铜色包边，表面手工绘制武魂世系图。卷轴端头略磨损，内页有手写注记。",
      },
      {
        name: "汤药碗",
        description: "陶瓷湛蓝药碗，碗沿有银灰色裂纹，表面留有药渍，碗中汤药颜色浓烈，散发淡淡草药香气。",
      },
      {
        name: "林白佩剑",
        description: "黑铁长剑，剑身有旧划痕，剑柄缀以红色丝线。剑鞘灰黑，贴有林家标志。",
      },
    ],
    coreConflict: "林白渴望觉醒顶级武魂，林紫儿通过秘法暗算并夺取灵魂力量，致林白身败名裂。",
    outline:
      "林家一年一度的武魂觉醒仪式上，林白信心满怀准备觉醒顶级武魂并向林紫儿许下终身承诺。林紫儿却突然靠近，以温柔的外表施展秘法，夺取林白灵魂力量，露出真实面目和野心。林泰岳现身，合谋助林紫儿达成目的。林紫儿觉醒天级五品武魂，全场震惊。林白虚弱登台，只觉醒黄级一品武魂，成为家族笑柄并被废除少主之位。林紫儿建议将林白父亲留下的修行资源据为己有，长老团默许。林白愤怒揭露真相却被驱逐祖宅，林杰强行赶人，林白与三叔无依无靠。林白暗下决心复仇，残余温情与信任尽数破碎，家族背后权谋浮现。",
    openingHook: "林白自信满怀走上武魂台，周围族人目光期待，夕阳下仪式肃穆。",
    keyEvents: [
      "林白满怀期待，向林紫儿许诺美好未来，走上武魂台",
      "林紫儿靠近施秘法夺取林白灵魂力量，露出野心，林泰岳合谋",
      "林紫儿觉醒天级五品武魂，林白被废少主之位，资源遭夺",
      "林白愤怒揭露真相，被驱逐祖宅，林杰强行赶人，林白决心复仇",
    ],
    emotionalCurve: "3(期待)→8(背叛)→9(羞辱爆发)→4(复仇余波)",
    visualHighlights: [
      "林白自信走上武魂台，族人期待目光",
      "林紫儿狡黠靠近，手掌按在林白腹部，灵魂力量被吸走",
      "林泰岳重踹林白，林紫儿觉醒天级五品武魂，光芒映全场",
      "林白登台只觉醒黄级一品，族人嘲笑，林紫儿得意",
      "林白被逐祖宅，三叔搀扶离开，林白落寞目送",
    ],
    endingHook: "林白回望祖宅，暗下决心：有朝一日必亲手夺回一切。",
    classicQuotes: ["林紫儿：你的灵魂力量，成全我吧！", "林白：你们这对贼父女不得好死！"],
  },
]);
//编辑
const selectedOutline = ref<Outline>({
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
const outlineShow = ref(false);
function editOutlineFn(outline: Outline) {
  selectedOutline.value = {
    ...outline,
  };
  outlineShow.value = true;
}

// 处理大纲更新
function handleOutlineUpdate(updatedOutline: Outline) {
  const index = outlineData.value.findIndex((item) => item.episodeIndex === updatedOutline.episodeIndex);
  if (index !== -1) {
    outlineData.value[index] = updatedOutline;
  }
  console.log("更新后的大纲：", updatedOutline);
}

//添加数据
function addOutline() {
  selectedOutline.value = {
    episodeIndex: outlineData.value.length + 1,
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
  };
  outlineShow.value = true;
}
//故事线数据
const storyLine = ref(`《惊天剑帝》第1章《武魂觉醒》短剧故事线

═══════════════════════════════════════

【总览】
时间跨度：约1天（武魂觉醒白日→当夜被逐出祖宅）
核心主题：被最亲近的人掠夺后跌入谷底，主角在屈辱中立誓夺回命运。
关键转折：林紫儿当众以秘法抽走林白灵魂之力，直接改写觉醒结果，并引发少主易位与资源被夺。

═══════════════════════════════════════

【第一阶段：甜蜜承诺→贴身夺魂】第1章（前段）
- 武魂觉醒大典，族人轮番测出黄级，现场喧闹；林白被称“少主第一天才”，众人等他天级起飞。
- 林紫儿在众目中挽着林白，以“最后一个请求”贴耳低语，手掌按上丹田，黑光丝线钻入体内。
- 林白当场痛到跪地，灵魂之力被抽离；他抓住林紫儿手腕质问。
- 林紫儿撕下温柔：多年陪伴只为等林白“养熟”，要夺走养魂丹与灵魂之力。
- 大长老林泰岳现身护女，一脚踹飞林白，肋骨断裂，血溅祭台。

核心矛盾：林白要凭天赋觉醒与守住父亲遗产 vs 林紫儿/林泰岳要用掠夺换取高阶武魂并夺权
情绪推进：憧憬 → 猝痛 → 当众羞辱 → 血怒
因果链条：养魂丹积累灵魂之力 → 林紫儿贴身夺魂 → 林白觉醒资本被毁、当场重伤

---

【第二阶段：神女登顶→废少主夺家产】第1章（中段）
- 林紫儿上台觉醒，虹光冲霄，宣布“天级五品”，全族跪拜；林泰岳借势喊出“林家未来在此”。
- 轮到林白，众人起哄等奇迹；测魂石只亮出微弱剑影——“黄级一品”。嘲笑声盖过鼓声。
- ★转折点★ 林泰岳当众宣读：废林白少主之位，立林紫儿为少主。
- 林紫儿趁热追击，要求将林狼留下、由家族“代管”的修行资源全部转到她名下；长老团沉默即默认。
- 林白怒骂“贼父女”，挣扎扑上去被再度压倒，气血翻涌吐血昏迷。

关系变化（有事件支撑）：
- 林白×林紫儿：恋人誓言 → 夺魂仇敌（贴身夺魂+夺位夺产）
- 林白×林泰岳：长辈权威 → 公开施暴者（踹断肋骨+废少主）
- 林白×长老团：家族依靠 → 冷眼共犯（默认改立+默认转移资源）

---

【第三阶段：护一人→逐出祖宅→立誓反杀】第1章（后段）
- 林白醒来，三叔林跃端药守着，低声问清真相，挡在门前不许人再动手。
- 林杰奉命带人闯入，宣告祖宅已赏他“养狗”，勒令林白当夜滚出；并搜走衣物与旧物，威胁“乱棍打死”。
- 林白咬碎血沫，拖着伤体出门，回头看见祖宅门匾被摘下、灯火换了主人。
- 他握紧掌心残留的剑影气息：黄级一品也要杀出路，誓言“今日所失，来日十倍讨回”。

═══════════════════════════════════════

【人物关系变化】
主角（林白）：
- 起点 → 林家少主、众望所归、与林紫儿许诺未来
- 终点 → 被夺魂重伤、觉醒低阶、少主被废、父亲遗产被夺、被逐出祖宅，唯一盟友只剩林跃

周边人物：
- 林紫儿：温柔相伴 → 夺魂夺位的仇人（夺魂摊牌+神女登顶）
- 林泰岳：长老威望 → 夺权打手（施暴+宣废立新）
- 长老团：裁决者 → 默许掠夺者（沉默通过资源转移）
- 林跃：边缘亲族 → 唯一护身盾（守床送药+门口护人）
- 林杰：同族小辈 → 逐人夺宅者（带人驱逐+搜走私物）

═══════════════════════════════════════

【重要伏笔】
1. 林白父母下落为何成禁话？（只提“找回爹娘”，原因未揭）
2. 林紫儿夺魂秘法从何而来？（谁教她、为何敢在族内动手）
3. 林狼遗留“代管资源”具体是什么？（是否藏有逆转关键）
4. 林跃当年随林狼历练为何被废修为？（是否与父母失踪同线）

═══════════════════════════════════════

【节奏与高潮】
情节密度：★★★★★（夺魂→神女觉醒对比→废少主→夺家产→逐出祖宅，连续不可逆）
情绪曲线：甜蜜期待 → 剧痛坠落 → 群嘲羞辱 → 暴怒失控 → 屈辱隐忍 → 复仇点火
高潮点：
① 夺魂摊牌：林紫儿贴身抽魂，林泰岳一脚踹断肋骨，血溅祭台。
② 废立夺产：林白觉醒黄级一品遭群嘲，当众废少主并转走父亲遗产。
③ 夜逐出门：林杰带人夺宅搜身，林白带伤踏出祖宅，誓言反杀。

═══════════════════════════════════════

【主题演变】
第一层：身份坠落（少主→废人→被逐）
→ 让“天赋与身份”瞬间失效。
第二层：掠夺规则（强者用家族名义重分资源）
→ 让背叛不止是感情，而是权力清算。
第三层：自我重建（以最弱武魂立誓翻盘）
→ 复仇从情绪变成行动目标。

═══════════════════════════════════════

结尾悬念：
林白刚踏出祖宅，林紫儿在高台上淡声一句“斩草除根”，林泰岳目光一冷，暗影护卫随即离席追出——今夜，他能活到天亮吗？`);
const isEditingStoryLine = ref(false);
const storyLineBackup = ref("");

// 开始编辑故事线
function startEditStoryLine() {
  storyLineBackup.value = storyLine.value;
  isEditingStoryLine.value = true;
}

// 保存故事线
function saveStoryLine() {
  isEditingStoryLine.value = false;
}

// 取消编辑
function cancelEditStoryLine() {
  storyLine.value = storyLineBackup.value;
  isEditingStoryLine.value = false;
}
</script>

<style lang="scss" scoped>
.agent {
  height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  h2 {
    flex-shrink: 0;
  }
  .data {
    flex: 1;
    gap: 20px;
    overflow: hidden;
    .operate {
      width: 25%;
      display: flex;
      flex-direction: column;
      min-height: 0;
      .box {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        border-radius: 10px;
        border: 1px solid #e6e3e3;
        background-color: #fff;
        overflow: hidden;
        position: relative;
      }
    }
    .data {
      border-left: 1px solid #e7e7e7;
      display: flex;
      flex-direction: column;
      position: relative;
      .title {
        flex-shrink: 0;
      }
      .tabsWrapper {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        padding: 20px;
        transition: padding-bottom 0.3s ease;
        &.has-bottom {
          padding-bottom: 70px;
        }
        :deep(.t-tabs) {
          display: flex;
          flex-direction: column;
          height: 100%;
          .t-tabs__header {
            flex-shrink: 0;
          }
          .t-tabs__content {
            flex: 1;
            overflow: hidden;
          }
          .t-tab-panel {
            height: 100%;
          }
        }
      }
      .storyLine {
        padding: 20px;
        height: 100%;
        display: flex;
        flex-direction: column;

        .storyLineCard {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid #e7e7e7;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          .cardHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 24px 28px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-bottom: 2px solid #e7e7e7;
            flex-shrink: 0;
            z-index: 1;

            .headerLeft {
              display: flex;
              align-items: center;
              gap: 16px;

              .headerInfo {
                .cardTitle {
                  margin: 0;
                  font-size: 22px;
                  font-weight: 700;
                  color: #1f1f1f;
                  letter-spacing: 0.5px;
                }

                .cardSubtitle {
                  margin: 4px 0 0 0;
                  font-size: 13px;
                  color: #8590a6;
                  font-weight: 500;
                  letter-spacing: 1px;
                  text-transform: uppercase;
                }
              }
            }

            .headerRight {
              .statsGroup {
                display: flex;
                gap: 24px;

                .statItem {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  padding: 10px 16px;
                  background: #ffffff;
                  border-radius: 8px;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                  transition: all 0.3s ease;
                  .statIcon {
                    font-size: 18px;
                  }

                  .statValue {
                    font-size: 18px;
                    font-weight: 700;
                    color: #0052d9;
                  }

                  .statLabel {
                    font-size: 13px;
                    color: #8590a6;
                  }
                }
              }
            }
          }
          .contentDisplay {
            .storyContent {
              padding: 20px;
              white-space: pre-wrap;
              word-break: break-word;
              line-height: 1.8;
              color: var(--td-text-color-secondary);
              font-size: 14px;
              max-height: 500px;
              overflow-y: auto;
              padding-right: 10px;

              &::-webkit-scrollbar {
                width: 6px;
              }

              &::-webkit-scrollbar-thumb {
                background: var(--td-scrollbar-color);
                border-radius: 3px;
              }

              &::-webkit-scrollbar-thumb:hover {
                background: var(--td-scrollbar-hover-color);
              }
            }
          }

          .textareaWrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 28px;
            overflow: hidden;
            min-height: 0;

            .storylineTextarea {
              flex: 1;
              display: flex;
              flex-direction: column;
              min-height: 0;
              :deep(.t-textarea__inner) {
                border-radius: 12px;
                padding: 16px;
                font-size: 15px;
                line-height: 1.8;
                color: #333;
                transition: all 0.3s ease;
                resize: none;
                flex: 1;
                height: 100% !important;
                min-height: 0 !important;
                max-height: none !important;
                overflow-y: auto !important;
              }
            }
          }

          .storylineTextarea {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
          }
        }

        .footerActions {
          padding: 20px 28px 24px 28px;
          flex-shrink: 0;
          border-top: 1px solid #f0f0f0;
          background: #ffffff;
          z-index: 1;

          .actionButtons {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
        }
      }

      .storyLineEmpty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
        border-radius: 16px;
        border: 2px dashed #d9d9d9;
        padding: 60px;
        transition: all 0.3s ease;

        .emptyIcon {
          margin-bottom: 24px;
          opacity: 0.5;
          transition: all 0.3s ease;
        }

        .emptyTitle {
          margin: 0 0 12px 0;
          font-size: 24px;
          font-weight: 700;
          color: #333;
        }

        .emptyDesc {
          margin: 0 0 32px 0;
          font-size: 15px;
          color: #8590a6;
          text-align: center;
          max-width: 400px;
          line-height: 1.6;
        }
      }
    }
    .bottom {
      position: absolute;
      width: 100%;
      bottom: 0;
      left: 0;
      height: 50px;
      border-top: 1px solid #e7e7e7;
      display: flex;
      justify-content: flex-end;
      padding-right: 20px;
      background: #ffffff;
      z-index: 10;
    }
    .outline {
      margin-top: 20px;
      gap: 15px;
      height: 100%;
      overflow-y: auto;
      .cardWrapper {
        margin-bottom: 15px;
      }

      .episodeCard {
        width: 330px;
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;

        :deep(.t-card__body) {
          padding: 20px;
        }
        &:hover {
          transform: translateY(-2px);
          .deleteBtn {
            opacity: 1;
          }
        }
        .deleteBtn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #fff;
          cursor: pointer;
          z-index: 10;
          opacity: 0;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          &:hover {
            background-color: #f5f5f5;
            transform: scale(1.1);
          }
        }
        .cardHeader {
          margin-bottom: 16px;
          .sortBadge {
            display: inline-block;
            color: #adabab;
            font-size: 15px;
            border-radius: 12px;
            letter-spacing: 0.5px;
          }

          .titleText {
            font-size: 18px;
            font-weight: 700;
            color: #000;
            line-height: 1.4;
            margin-top: 8px;
          }
        }

        .charactersSection {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e7e7e7;
        }

        .contentSection {
          display: flex;
          flex-direction: column;
          gap: 16px;

          .sectionItem {
            .sectionLabel {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 13px;
              font-weight: 600;
              color: #555;
              margin-bottom: 8px;
            }

            .sectionContent {
              font-size: 14px;
              line-height: 1.6;
              color: #333;
              padding-left: 20px;
              position: relative;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
          }
        }
      }
    }
  }
}
</style>
