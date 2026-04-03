/**
 * 转场效果渲染器模块
 * 提供各种转场效果的帧级渲染实现
 */

/**
 * 转场渲染器接口
 */
export interface TransitionRenderer {
  /**
   * 渲染转场效果
   * @param ctx - OffscreenCanvas 2D 上下文
   * @param frameA - 前一个视频帧（转场开始前的 clip）
   * @param frameB - 后一个视频帧（转场结束后的 clip）
   * @param progress - 转场进度 0-1
   * @param width - 画布宽度
   * @param height - 画布高度
   */
  render(
    ctx: OffscreenCanvasRenderingContext2D,
    frameA: VideoFrame | ImageBitmap | null,
    frameB: VideoFrame | ImageBitmap | null,
    progress: number,
    width: number,
    height: number,
  ): void;
}

/**
 * 转场类型枚举
 */
export type TransitionType =
  | "fade" // 淡入淡出
  | "dissolve" // 溶解
  | "slide-left" // 向左滑动
  | "slide-right" // 向右滑动
  | "slide-up" // 向上滑动
  | "slide-down" // 向下滑动
  | "wipe-left" // 向左擦除
  | "wipe-right" // 向右擦除
  | "wipe-up" // 向上擦除
  | "wipe-down" // 向下擦除
  | "zoom-in" // 放大
  | "zoom-out" // 缩小
  | "rotate" // 旋转
  | "blur" // 模糊过渡
  | "pixelate" // 像素化过渡
  | "circle" // 圆形遮罩
  | "diamond" // 菱形遮罩
  | "clock"; // 时钟擦除

// ============ 转场渲染器实现 ============

/**
 * 淡入淡出转场
 * 前一帧渐隐，后一帧渐显
 */
export const fadeTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    // 绘制 frameA（渐隐）
    if (frameA) {
      ctx.globalAlpha = 1 - progress;
      ctx.drawImage(frameA, 0, 0, width, height);
    }

    // 绘制 frameB（渐显）
    if (frameB) {
      ctx.globalAlpha = progress;
      ctx.drawImage(frameB, 0, 0, width, height);
    }

    ctx.globalAlpha = 1;
  },
};

/**
 * 溶解转场
 * 类似淡入淡出，但使用叠加混合模式
 */
export const dissolveTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    // 绘制 frameA
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }

    // 使用 source-atop 混合模式绘制 frameB
    if (frameB) {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = progress;
      ctx.drawImage(frameB, 0, 0, width, height);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  },
};

/**
 * 向左滑动转场
 * frameA 向左滑出，frameB 从右侧滑入
 */
export const slideLeftTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    // 使用缓动函数让动画更自然
    const easedProgress = easeInOutCubic(progress);
    const slideX = width * easedProgress;

    // frameA 向左滑出
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, -slideX, 0, width, height);
    }

    // frameB 从右侧滑入
    if (frameB) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameB, width - slideX, 0, width, height);
    }
  },
};

/**
 * 向右滑动转场
 * frameA 向右滑出，frameB 从左侧滑入
 */
export const slideRightTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const easedProgress = easeInOutCubic(progress);
    const slideX = width * easedProgress;

    // frameA 向右滑出
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, slideX, 0, width, height);
    }

    // frameB 从左侧滑入
    if (frameB) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameB, -width + slideX, 0, width, height);
    }
  },
};

/**
 * 向上滑动转场
 * frameA 向上滑出，frameB 从下方滑入
 */
export const slideUpTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const easedProgress = easeInOutCubic(progress);
    const slideY = height * easedProgress;

    // frameA 向上滑出
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, -slideY, width, height);
    }

    // frameB 从下方滑入
    if (frameB) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameB, 0, height - slideY, width, height);
    }
  },
};

/**
 * 向下滑动转场
 * frameA 向下滑出，frameB 从上方滑入
 */
export const slideDownTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const easedProgress = easeInOutCubic(progress);
    const slideY = height * easedProgress;

    // frameA 向下滑出
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, slideY, width, height);
    }

    // frameB 从上方滑入
    if (frameB) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameB, 0, -height + slideY, width, height);
    }
  },
};

/**
 * 向左擦除转场
 * 从右向左逐渐显示 frameB
 */
export const wipeLeftTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const easedProgress = easeInOutQuad(progress);
    const wipeX = width * easedProgress;

    // 先绘制 frameA 作为底层
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }

    // 使用裁剪区域绘制 frameB（从右向左）
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(width - wipeX, 0, wipeX, height);
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  },
};

/**
 * 向右擦除转场
 * 从左向右逐渐显示 frameB
 */
export const wipeRightTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const easedProgress = easeInOutQuad(progress);
    const wipeX = width * easedProgress;

    // 先绘制 frameA 作为底层
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }

    // 使用裁剪区域绘制 frameB（从左向右）
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, wipeX, height);
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  },
};

/**
 * 向上擦除转场
 * 从下向上逐渐显示 frameB
 */
export const wipeUpTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const easedProgress = easeInOutQuad(progress);
    const wipeY = height * easedProgress;

    // 先绘制 frameA 作为底层
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }

    // 使用裁剪区域绘制 frameB（从下向上）
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, height - wipeY, width, wipeY);
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  },
};

/**
 * 向下擦除转场
 * 从上向下逐渐显示 frameB
 */
export const wipeDownTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const easedProgress = easeInOutQuad(progress);
    const wipeY = height * easedProgress;

    // 先绘制 frameA 作为底层
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }

    // 使用裁剪区域绘制 frameB（从上向下）
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, wipeY);
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  },
};

/**
 * 放大转场
 * frameB 从中心放大覆盖 frameA
 */
export const zoomInTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const easedProgress = easeInOutCubic(progress);

    // 先绘制 frameA 作为底层
    if (frameA) {
      ctx.globalAlpha = 1 - easedProgress * 0.5;
      ctx.drawImage(frameA, 0, 0, width, height);
    }

    // frameB 从中心放大
    if (frameB) {
      const scale = easedProgress;
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      const offsetX = (width - scaledWidth) / 2;
      const offsetY = (height - scaledHeight) / 2;

      ctx.globalAlpha = easedProgress;
      ctx.drawImage(frameB, offsetX, offsetY, scaledWidth, scaledHeight);
    }

    ctx.globalAlpha = 1;
  },
};

/**
 * 缩小转场
 * frameA 缩小消失，显示 frameB
 */
export const zoomOutTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const easedProgress = easeInOutCubic(progress);

    // 先绘制 frameB 作为底层
    if (frameB) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameB, 0, 0, width, height);
    }

    // frameA 缩小
    if (frameA) {
      const scale = 1 - easedProgress;
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      const offsetX = (width - scaledWidth) / 2;
      const offsetY = (height - scaledHeight) / 2;

      ctx.globalAlpha = 1 - easedProgress;
      ctx.drawImage(frameA, offsetX, offsetY, scaledWidth, scaledHeight);
    }

    ctx.globalAlpha = 1;
  },
};

/**
 * 旋转转场
 * frameA 旋转消失，frameB 旋转出现
 */
export const rotateTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const easedProgress = easeInOutCubic(progress);
    const centerX = width / 2;
    const centerY = height / 2;

    // frameA 旋转消失
    if (frameA && progress < 0.5) {
      const angle = easedProgress * Math.PI; // 0 到 180度
      const scale = 1 - easedProgress * 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.scale(Math.max(0.01, scale), Math.max(0.01, scale));
      ctx.translate(-centerX, -centerY);
      ctx.globalAlpha = 1 - easedProgress * 2;
      ctx.drawImage(frameA, 0, 0, width, height);
      ctx.restore();
    }

    // frameB 旋转出现
    if (frameB && progress >= 0.5) {
      const angle = (easedProgress - 0.5) * Math.PI * 2 - Math.PI; // -180到0度
      const scale = (easedProgress - 0.5) * 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.scale(Math.max(0.01, scale), Math.max(0.01, scale));
      ctx.translate(-centerX, -centerY);
      ctx.globalAlpha = (easedProgress - 0.5) * 2;
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  },
};

/**
 * 圆形遮罩转场
 * 从中心向外扩展的圆形显示 frameB
 */
export const circleTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const easedProgress = easeInOutQuad(progress);
    const centerX = width / 2;
    const centerY = height / 2;
    // 计算对角线长度作为最大半径
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    const radius = maxRadius * easedProgress;

    // 先绘制 frameA 作为底层
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }

    // 使用圆形裁剪绘制 frameB
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  },
};

/**
 * 菱形遮罩转场
 * 从中心向外扩展的菱形显示 frameB
 */
export const diamondTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const easedProgress = easeInOutQuad(progress);
    const centerX = width / 2;
    const centerY = height / 2;
    const maxSize = Math.max(width, height);
    const size = maxSize * easedProgress;

    // 先绘制 frameA 作为底层
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }

    // 使用菱形裁剪绘制 frameB
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - size); // 上
      ctx.lineTo(centerX + size, centerY); // 右
      ctx.lineTo(centerX, centerY + size); // 下
      ctx.lineTo(centerX - size, centerY); // 左
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  },
};

/**
 * 时钟擦除转场
 * 像时钟指针一样扫过显示 frameB
 */
export const clockTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const easedProgress = easeLinear(progress);
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY) * 1.5;
    const angle = easedProgress * Math.PI * 2 - Math.PI / 2; // 从12点钟方向开始

    // 先绘制 frameA 作为底层
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }

    // 使用扇形裁剪绘制 frameB
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadius, -Math.PI / 2, angle, false);
      ctx.lineTo(centerX, centerY);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  },
};

/**
 * 模糊过渡转场
 * 通过模糊效果进行过渡（注意：Canvas 2D 的 filter 性能开销较大）
 */
export const blurTransition: TransitionRenderer = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);

    const maxBlur = 20;
    const blurA = progress * maxBlur;
    const blurB = (1 - progress) * maxBlur;

    // 绘制 frameA（渐隐 + 模糊）
    if (frameA) {
      ctx.save();
      ctx.filter = `blur(${blurA}px)`;
      ctx.globalAlpha = 1 - progress;
      ctx.drawImage(frameA, 0, 0, width, height);
      ctx.restore();
    }

    // 绘制 frameB（渐显 + 清晰）
    if (frameB) {
      ctx.save();
      ctx.filter = `blur(${blurB}px)`;
      ctx.globalAlpha = progress;
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.filter = "none";
  },
};

// ============ 缓动函数 ============

/**
 * 线性缓动
 */
function easeLinear(t: number): number {
  return t;
}

/**
 * 二次缓动 - 先慢后快再慢
 */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * 三次缓动 - 更平滑的加减速
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ============ 转场渲染器注册表 ============

/**
 * 转场渲染器映射表
 */
export const transitionRenderers: Record<string, TransitionRenderer> = {
  fade: fadeTransition,
  dissolve: dissolveTransition,
  slide: slideLeftTransition, // 默认滑动方向
  "slide-left": slideLeftTransition,
  "slide-right": slideRightTransition,
  "slide-up": slideUpTransition,
  "slide-down": slideDownTransition,
  wipe: wipeRightTransition, // 默认擦除方向
  "wipe-left": wipeLeftTransition,
  "wipe-right": wipeRightTransition,
  "wipe-up": wipeUpTransition,
  "wipe-down": wipeDownTransition,
  zoom: zoomInTransition, // 默认放大
  "zoom-in": zoomInTransition,
  "zoom-out": zoomOutTransition,
  rotate: rotateTransition,
  circle: circleTransition,
  diamond: diamondTransition,
  clock: clockTransition,
  blur: blurTransition,
};

/**
 * 获取转场渲染器
 * @param type 转场类型
 * @returns 对应的渲染器，如果类型未知则返回默认的淡入淡出
 */
export function getTransitionRenderer(type: string): TransitionRenderer {
  return transitionRenderers[type] || fadeTransition;
}

/**
 * 获取所有支持的转场类型
 */
export function getSupportedTransitionTypes(): string[] {
  return Object.keys(transitionRenderers);
}

/**
 * 转场类型的 i18n key 映射
 */
const transitionTypeKeys: Record<string, string> = {
  fade: "workbench.production.transition.fade",
  dissolve: "workbench.production.transition.dissolve",
  slide: "workbench.production.transition.slide",
  "slide-left": "workbench.production.transition.slideLeft",
  "slide-right": "workbench.production.transition.slideRight",
  "slide-up": "workbench.production.transition.slideUp",
  "slide-down": "workbench.production.transition.slideDown",
  wipe: "workbench.production.transition.wipe",
  "wipe-left": "workbench.production.transition.wipeLeft",
  "wipe-right": "workbench.production.transition.wipeRight",
  "wipe-up": "workbench.production.transition.wipeUp",
  "wipe-down": "workbench.production.transition.wipeDown",
  zoom: "workbench.production.transition.zoom",
  "zoom-in": "workbench.production.transition.zoomIn",
  "zoom-out": "workbench.production.transition.zoomOut",
  rotate: "workbench.production.transition.rotate",
  circle: "workbench.production.transition.circle",
  diamond: "workbench.production.transition.diamond",
  clock: "workbench.production.transition.clock",
  blur: "workbench.production.transition.blur",
};

export function getTransitionTypeName(type: string): string {
  const key = transitionTypeKeys[type];
  return key ? $t(key) : type;
}
