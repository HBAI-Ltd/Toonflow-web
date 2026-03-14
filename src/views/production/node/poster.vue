<template>
  <t-card class="poster">
    <div class="titleBar">
      <div class="title">视频封面</div>
      <t-tag size="small" variant="outline">{{ props.data.posters.length }}张</t-tag>
    </div>
    <div class="posterGrid">
      <div v-for="(item, index) in props.data.posters" :key="item.id" class="posterCard">
        <div class="posterImage" :style="{ background: item.gradient }">
          <t-image v-if="item.image" :src="item.image" fit="cover" class="posterImg" />
          <div class="posterOverlay">
            <t-tag v-if="item.selected" theme="success" size="small" class="selectedTag">
              <template #icon><t-icon name="check" /></template>
              已选用
            </t-tag>
          </div>
        </div>
        <div class="posterInfo">
          <div class="posterName">{{ item.name }}</div>
          <div class="posterSize">{{ item.size }}</div>
        </div>
      </div>
    </div>
    <div class="actionBar">
      <t-button variant="outline" size="small" block>
        <template #icon><t-icon name="add" /></template>
        生成更多
      </t-button>
    </div>
  </t-card>
</template>

<script setup lang="ts">
interface PosterItem {
  id: number;
  name: string;
  size: string;
  image?: string;
  gradient?: string;
  selected?: boolean;
}

const props = defineProps<{
  id: string;
  data: {
    workbenchId: string;
    posters: PosterItem[];
  };
}>();
</script>

<style lang="scss" scoped>
.poster {
  min-width: 320px;

  .titleBar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .title {
    background-color: #000;
    width: fit-content;
    padding: 5px 10px;
    color: #fff;
    border-radius: 8px 0;
    font-size: 16px;
  }

  .posterGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 12px;
  }

  .posterCard {
    cursor: pointer;
    transition: transform 0.2s;

    &:hover {
      transform: translateY(-2px);
    }
  }

  .posterImage {
    position: relative;
    width: 100%;
    aspect-ratio: 9 / 16;
    border-radius: 6px;
    overflow: hidden;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .posterImg {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .posterOverlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 6px;
  }

  .selectedTag {
    font-size: 10px;
  }

  .posterInfo {
    margin-top: 6px;
  }

  .posterName {
    font-size: 12px;
    font-weight: 500;
    color: var(--td-text-color-primary, #333);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .posterSize {
    font-size: 10px;
    color: var(--td-text-color-secondary, #999);
  }

  .actionBar {
    margin-top: 8px;
  }
}
</style>
