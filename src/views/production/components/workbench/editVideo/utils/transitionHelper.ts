import {
  generateId,
  normalizeTime,
  type TransitionClip,
  type Clip,
} from "vue-clip-track";

const TRANSITION_NAME_KEYS: Record<string, string> = {
  fade: 'workbench.production.transition.fade',
  slide: 'workbench.production.transition.slide',
  wipe: 'workbench.production.transition.wipe',
  dissolve: 'workbench.production.transition.dissolve',
  zoom: 'workbench.production.transition.zoom',
  rotate: 'workbench.production.transition.rotate',
};

/** 在已排序的非转场 clips 中，根据 dropTime 查找相邻的两个 clip */
export function findAdjacentClipsAtTime(
  clips: Clip[],
  dropTime: number,
): { beforeClip: Clip; afterClip: Clip } | null {
  const targetClip = clips.find((c) => dropTime >= c.startTime && dropTime <= c.endTime);

  if (targetClip) {
    const clipMidPoint = (targetClip.startTime + targetClip.endTime) / 2;
    const targetIndex = clips.indexOf(targetClip);

    if (dropTime < clipMidPoint) {
      // 在前半部分，找前面相邻的 clip
      if (targetIndex > 0) {
        const prevClip = clips[targetIndex - 1];
        if (Math.abs(prevClip.endTime - targetClip.startTime) < 0.1) {
          return { beforeClip: prevClip, afterClip: targetClip };
        }
      }
    } else {
      // 在后半部分，找后面相邻的 clip
      if (targetIndex < clips.length - 1) {
        const nextClip = clips[targetIndex + 1];
        if (Math.abs(targetClip.endTime - nextClip.startTime) < 0.1) {
          return { beforeClip: targetClip, afterClip: nextClip };
        }
      }
    }
  } else {
    // 鼠标不在任何 clip 上，尝试找 dropTime 附近的相邻 clips
    for (let i = 0; i < clips.length - 1; i++) {
      if (clips[i].endTime <= dropTime && clips[i + 1].startTime >= dropTime) {
        if (Math.abs(clips[i].endTime - clips[i + 1].startTime) < 0.1) {
          return { beforeClip: clips[i], afterClip: clips[i + 1] };
        }
      }
    }
  }

  return null;
}

/**
 * 在两个 clip 之间添加转场
 * @returns 添加成功时返回转场信息，失败返回 null
 */
export function addTransitionBetweenClips(
  tracksStore: any,
  historyStore: any,
  beforeClipId: string,
  afterClipId: string,
  transitionType: string = "fade",
): { transitionClip: TransitionClip; beforeClip: Clip; afterClip: Clip } | null {
  const beforeClip = tracksStore.getClip(beforeClipId);
  const afterClip = tracksStore.getClip(afterClipId);

  if (!beforeClip || !afterClip) {
    console.error("未找到clip");
    return null;
  }

  const track = tracksStore.tracks.find((t: any) => t.id === beforeClip.trackId);
  if (!track) return null;

  // 检查是否已经有转场
  const hasExistingTransition = track.clips.some(
    (c: any) => c.type === "transition" && c.startTime < beforeClip.endTime && c.endTime > beforeClip.endTime,
  );

  if (hasExistingTransition) {
    window.$message.warning($t('workbench.production.editVideo.transitionExists'));
    return null;
  }

  const transitionDuration = 1;
  const transitionClip: TransitionClip = {
    id: generateId("clip-"),
    trackId: beforeClip.trackId,
    type: "transition",
    startTime: normalizeTime(beforeClip.endTime - transitionDuration / 2),
    endTime: normalizeTime(afterClip.startTime + transitionDuration / 2),
    selected: false,
    transitionType,
    transitionDuration: normalizeTime(transitionDuration),
    name: TRANSITION_NAME_KEYS[transitionType] ? $t(TRANSITION_NAME_KEYS[transitionType]) : transitionType,
  };

  tracksStore.addClip(beforeClip.trackId, transitionClip);
  historyStore.pushSnapshot("添加转场");
  tracksStore.clearSelection();

  return { transitionClip, beforeClip, afterClip };
}
