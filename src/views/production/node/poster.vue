<template>
  <t-card class="poster">
    <Handle :id="props.handleIds.target" type="target" :position="Position.Left" />
    <div class="titleBar dragHandle">
      <div class="title">{{ $t('workbench.production.node.poster.title') }}</div>
      <t-tag size="small" variant="outline">{{ $t('workbench.production.node.poster.coverCount', { count: poster?.items.length }) }}</t-tag>
    </div>
    <div class="posterGrid">
      <div v-for="(item, index) in poster?.items" :key="item.id" class="posterCard">
        <div class="posterImage">
          <t-image v-if="item.image" :src="item.image" fit="cover" class="posterImg">
            <template #overlayContent>
              <div class="imageToolsWrap">
                <ImageTools :src="item.image" position="br" />
              </div>
            </template>
          </t-image>
        </div>
      </div>
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

interface PosterItem {
  id: number;
  image?: string;
}

const props = defineProps<{
  id: string;
  handleIds: {
    target: string;
  };
}>();

const poster = defineModel<{ items: PosterItem[] }>({ required: true });
</script>

<style lang="scss" scoped>
.poster {
  width: fit-content;
  user-select: text;
  cursor: default;

  .titleBar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    cursor: grab;
    user-select: none;
    .title {
      background-color: #000;
      width: fit-content;
      padding: 5px 10px;
      color: #fff;
      border-radius: 8px 0;
      font-size: 16px;
    }
  }

  .posterGrid {
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: 10px;
    margin-bottom: 12px;

    .posterCard {
      cursor: pointer;
      transition: transform 0.2s;

      .posterImage {
        position: relative;
        border-radius: 6px;
        overflow: hidden;

        .posterImg {
          display: block;
          max-width: 200px;
          max-height: 200px;
          object-fit: cover;
          .imageToolsWrap {
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
          }
          &:hover {
            .imageToolsWrap {
              opacity: 1;
              pointer-events: auto;
            }
          }
        }

        .posterOverlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          padding: 6px;
        }
      }
    }
  }
}
</style>
