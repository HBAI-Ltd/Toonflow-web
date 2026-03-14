<template>
  <t-card class="assets">
    <Handle :id="props.data.handleIds.target" type="target" :position="Position.Top" />
    <div class="title">衍生资产</div>
    <div class="content">
      <div class="sectionTitle">人物设定</div>
      <div class="cardList">
        <div v-for="(character, index) in props.data.characters" :key="index" class="assetCard" :style="{ backgroundColor: character.bgColor }">
          <t-tag size="small" class="cardTag">人设</t-tag>
          <div class="cardInfo">
            <div class="cardName">{{ character.name }}</div>
            <div class="cardDesc">{{ character.desc }}</div>
          </div>
        </div>
      </div>
      <div class="sectionTitle">场景设定</div>
      <div class="cardList">
        <div v-for="(scene, index) in props.data.scenes" :key="index" class="assetCard" :style="{ backgroundColor: scene.bgColor }">
          <t-tag size="small" theme="success" class="cardTag">场设</t-tag>
          <div class="cardInfo">
            <div class="cardName">{{ scene.name }}</div>
            <div class="cardDesc">{{ scene.desc }}</div>
          </div>
        </div>
      </div>
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

interface Character {
  name: string;
  desc: string;
  bgColor: string;
}

interface Scene {
  name: string;
  desc: string;
  bgColor: string;
}

const props = defineProps<{
  id: string;
  data: {
    characters: Character[];
    scenes: Scene[];
    handleIds: {
      target: string;
    };
  };
}>();
</script>

<style lang="scss" scoped>
.assets {
  min-width: 400px;
  .title {
    background-color: #000;
    width: fit-content;
    padding: 5px 10px;
    color: #fff;
    border-radius: 8px 0;
    font-size: 16px;
  }
  .content {
    margin-top: 8px;
  }
  .sectionTitle {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin: 16px 0 12px;
    &:first-child {
      margin-top: 8px;
    }
  }
  .cardList {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .assetCard {
    width: 140px;
    height: 120px;
    border-radius: 8px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    cursor: pointer;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }
  .cardTag {
    width: fit-content;
  }
  .cardInfo {
    .cardName {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }
    .cardDesc {
      font-size: 12px;
      color: #666;
    }
  }
}
</style>
