export const MANUAL_OMNI_REFERENCE_MODE = "jimengOmniReferenceManual";
export const MANUAL_SMART_MULTI_FRAME_MODE = "jimengSmartMultiFrameManual";

export type ManualVideoMode = typeof MANUAL_OMNI_REFERENCE_MODE | typeof MANUAL_SMART_MULTI_FRAME_MODE;
export type VideoModeOption = { value: string; label: string };

const OMNI_REFERENCE_PROMPT_MODE = ["imageReference:9", "videoReference:3", "audioReference:3"] as const;
const SMART_MULTI_FRAME_PROMPT_MODE = ["imageReference:9"] as const;

export function isManualOmniReferenceMode(mode: unknown): mode is typeof MANUAL_OMNI_REFERENCE_MODE {
  return mode === MANUAL_OMNI_REFERENCE_MODE;
}

export function isManualSmartMultiFrameMode(mode: unknown): mode is typeof MANUAL_SMART_MULTI_FRAME_MODE {
  return mode === MANUAL_SMART_MULTI_FRAME_MODE;
}

export function isManualVideoMode(mode: unknown): mode is ManualVideoMode {
  return isManualOmniReferenceMode(mode) || isManualSmartMultiFrameMode(mode);
}

export function isJimengOrSeedanceModel(model?: string | null): boolean {
  return /jimeng|即梦|seedance/i.test(String(model ?? ""));
}

export function appendManualVideoModeOptions<T extends VideoModeOption>(options: T[], model?: string | null): VideoModeOption[] {
  if (!isJimengOrSeedanceModel(model)) return options;
  const next: VideoModeOption[] = [...options];
  if (!next.some((item) => item.value === MANUAL_OMNI_REFERENCE_MODE)) {
    next.push({ value: MANUAL_OMNI_REFERENCE_MODE, label: "全能参考（官网手动）" });
  }
  if (!next.some((item) => item.value === MANUAL_SMART_MULTI_FRAME_MODE)) {
    next.push({ value: MANUAL_SMART_MULTI_FRAME_MODE, label: "智能多帧（官网手动）" });
  }
  return next;
}

export function getPromptGenerationMode<T>(mode: T): T | string[] {
  if (isManualOmniReferenceMode(mode)) return [...OMNI_REFERENCE_PROMPT_MODE];
  if (isManualSmartMultiFrameMode(mode)) return [...SMART_MULTI_FRAME_PROMPT_MODE];
  return mode;
}

export function buildSmartFrameTransitionText(index: number): string {
  const from = Math.max(0, index) + 1;
  return `第 ${from} 帧到第 ${from + 1} 帧：保持主体一致，镜头自然过渡，动作连续，画面风格和光影统一。`;
}
