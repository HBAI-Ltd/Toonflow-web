import axios from "@/utils/axios";
// 图片项
export interface ImageItem {
  id: number;
  filePath: string;
  prompt: string;
}

// 视频生成类型
export type VideoGenerationType =
  | "singleImage" // 单图
  | "startEndRequired" // 首尾帧（两张都得有）
  | "endFrameOptional" // 首尾帧（尾帧可选）
  | "startFrameOptional" // 首尾帧（首帧可选）
  | "multiImage" // 多图模式
  | "reference" // 参考图模式
  | "text"; // 文本生视频

// 时长分辨率映射
export interface DurationResolutionMap {
  duration: number[];
  resolution: (`${number}p` | `${number}k`)[];
}

// 模型配置
export interface ModelConfig {
  manufacturer: string;
  model: string;
  durationResolutionMap: DurationResolutionMap[];
  aspectRatio: `${number}:${number}`[];
  type: VideoGenerationType[];
  audio: boolean;
}

// 视频配置
export interface VideoConfigData {
  id: number;
  manufacturer: string;
  aiConfigId: number | undefined;
  model: string;
  mode: "startEnd" | "multi" | "single" | "text";
  audio?: 0 | 1;
  startFrame: ImageItem | null;
  endFrame: ImageItem | null;
  images: ImageItem[];
  resolution: string;
  duration: number;
  prompt: string;
  promptLoading?: boolean;
  audioEnabled: boolean;
}

// 厂商配置定义（向后兼容）
export interface ManufacturerConfig {
  label: string;
  value: string;
  modes: { label: string; value: string }[];
  defaultMode: string;
  resolutions: { label: string; value: string }[];
  defaultResolution: string;
  resolutionLabel: string;
  durationOptions?: { label: string; value: number }[];
  durationRange?: { min: number; max: number; step: number };
  durationTip?: string;
  maxImages: number;
}

// 厂商标签映射
export const manufacturerLabels: Record<string, string> = {
  volcengine: "火山引擎(豆包)",
  runninghub: "RunningHub(Sora)",
  // apimart: "Apimart(Sora)",
  openAi: "OpenAI(Sora)",
  kling: "可灵",
  vidu: "Vidu",
  wan: "万象",
  gemini: "Gemini Veo",
  xai: "XAI",
  grsai: "Grsai",
  other: "其他",
  formal:"官方中转"
};

// 模式标签映射
export const modeLabels: Record<string, string> = {
  startEnd: "首尾帧模式",
  multi: "多图模式",
  single: "单图模式",
  text: "文本模式",
};

// VideoGenerationType 到前端 mode 的映射
export const typeToModeMap: Record<VideoGenerationType, VideoConfigData["mode"]> = {
  text: "text",
  singleImage: "single",
  multiImage: "multi",
  startEndRequired: "startEnd",
  endFrameOptional: "startEnd",
  startFrameOptional: "startEnd",
  reference: "single",
};
let modelList: ModelConfig[] = [];
async function getModelList() {
  if (!modelList.length) {
    const { data } = await axios.post("/setting/getVideoModelDetail");
    modelList = data;
    return modelList;
  }

  return modelList;
}
export { modelList, getModelList };


// 根据 modelList 动态生成厂商支持的所有模式
function getManufacturerSupportedModes(manufacturer: string, model?: string): { label: string; value: string }[] {
  let manufacturerModels = modelList.filter((m) => m.manufacturer === manufacturer);

  // 如果指定了 model，只使用该模型的配置
  if (model) {
    manufacturerModels = manufacturerModels.filter((m) => m.model === model);
  }

  const allTypes = new Set<VideoGenerationType>();

  manufacturerModels.forEach((model) => {
    model.type.forEach((type) => allTypes.add(type));
  });

  const modes = Array.from(new Set(Array.from(allTypes).map((t) => typeToModeMap[t])))
    .filter(Boolean)
    .map((mode) => ({
      label: modeLabels[mode] || mode,
      value: mode,
    }));

  return modes;
}

// 根据 modelList 动态生成厂商支持的所有分辨率/比例
function getManufacturerSupportedResolutions(
  manufacturer: string,
  model?: string,
): {
  resolutions: { label: string; value: string }[];
  resolutionLabel: string;
} {
  let manufacturerModels = modelList.filter((m) => m.manufacturer === manufacturer);

  // 如果指定了 model，只使用该模型的配置
  if (model) {
    manufacturerModels = manufacturerModels.filter((m) => m.model === model);
  }

  const allResolutions = new Set<string>();

  manufacturerModels.forEach((model) => {
    model.durationResolutionMap.forEach((map) => {
      map?.resolution.forEach((res) => allResolutions.add(res));
    });
  });

  let resolutions: { label: string; value: string }[] = [];
  let resolutionLabel = "分辨率";

  if (allResolutions.size > 0) {
    resolutions = Array.from(allResolutions).map((res) => ({
      label: res,
      value: res,
    }));
  }
  return { resolutions, resolutionLabel };
}

// 根据 modelList 动态生成厂商支持的时长范围
function getManufacturerSupportedDurations(
  manufacturer: string,
  model?: string,
): {
  durationOptions?: { label: string; value: number }[];
  durationRange?: { min: number; max: number; step: number };
  durationTip?: string;
} {
  let manufacturerModels = modelList.filter((m) => m.manufacturer === manufacturer);

  // 如果指定了 model，只使用该模型的配置
  if (model) {
    manufacturerModels = manufacturerModels.filter((m) => m.model === model);
  }

  const allDurations = new Set<number>();

  manufacturerModels.forEach((model) => {
    model.durationResolutionMap.forEach((map) => {
      map.duration.forEach((dur) => allDurations.add(dur));
    });
  });

  const durationArray = Array.from(allDurations).sort((a, b) => a - b);

  if (durationArray.length === 0) {
    return {};
  }

  if (durationArray.length <= 5) {
    return {
      durationOptions: durationArray.map((dur) => ({
        label: `${dur}秒`,
        value: dur,
      })),
    };
  } else {
    const min = Math.min(...durationArray);
    const max = Math.max(...durationArray);
    return {
      durationRange: { min, max, step: 1 },
      durationTip: `${min}-${max}秒`,
    };
  }
}

// 根据 modelList 动态生成厂商的最大图片数
function getManufacturerMaxImages(manufacturer: string, model?: string): number {
  let manufacturerModels = modelList.filter((m) => m.manufacturer === manufacturer);
  if (manufacturer !== "other") {
    // 如果指定了 model，只使用该模型的配置
    if (model) {
      manufacturerModels = manufacturerModels.filter((m) => m.model === model);
    }

    let maxImages = 1;
    manufacturerModels.forEach((model) => {
      if (model.type.includes("multiImage")) {
        maxImages = Math.max(maxImages, 9);
      } else if (model.type.includes("startEndRequired") || model.type.includes("endFrameOptional")) {
        maxImages = Math.max(maxImages, 2);
      }
    });
    return maxImages;
  } else {
    return 9;
  }
}

// 动态生成厂商配置（基于 modelList）
function generateManufacturerConfig(manufacturer: string, model?: string): ManufacturerConfig {
  const modes = getManufacturerSupportedModes(manufacturer, model);
  const { resolutions, resolutionLabel } = getManufacturerSupportedResolutions(manufacturer, model);
  const durations = getManufacturerSupportedDurations(manufacturer, model);
  const maxImages = getManufacturerMaxImages(manufacturer, model);

  return {
    label: manufacturerLabels[manufacturer] || manufacturer,
    value: manufacturer,
    modes,
    defaultMode: modes[0]?.value || "single",
    resolutions,
    defaultResolution: resolutions[0]?.value || "",
    resolutionLabel,
    ...durations,
    maxImages,
  };
}

// 厂商配置（向后兼容的静态配置，现在从 modelList 动态生成）
export const manufacturerConfigs: Record<string, ManufacturerConfig> = {
  volcengine: generateManufacturerConfig("volcengine"),
  kling: generateManufacturerConfig("kling"),
  vidu: generateManufacturerConfig("vidu"),
  wan: generateManufacturerConfig("wan"),
  gemini: generateManufacturerConfig("gemini"),
  runninghub: generateManufacturerConfig("runninghub"),
  grsai: generateManufacturerConfig("grsai"),
  // apimart: generateManufacturerConfig("apimart"),
  other: generateManufacturerConfig("other"),
  formal: generateManufacturerConfig("formal")
};

// 根据模型名称获取模型配置
export function getModelConfig(model: string, manufacturer: string): ModelConfig | undefined {
  return modelList.find((m) => m.model === model && m.manufacturer === manufacturer);
}

// 根据模型配置动态生成厂商配置（向后兼容）
export function getModelBasedConfig(modelConfig: ModelConfig): ManufacturerConfig {
  // 从 type 生成 modes
  const modes = Array.from(new Set(modelConfig.type.map((t) => typeToModeMap[t])))
    .filter(Boolean)
    .map((mode) => ({
      label: modeLabels[mode] || mode,
      value: mode,
    }));

  // 从 aspectRatio 或 durationResolutionMap 生成 resolutions
  let resolutions: { label: string; value: string }[] = [];
  let resolutionLabel = "分辨率";
  if (modelConfig.durationResolutionMap.length > 0) {
    const allResolutions = new Set<string>();
    modelConfig.durationResolutionMap.forEach((map) => {
      map?.resolution.forEach((res) => allResolutions.add(res));
    });
    resolutions = Array.from(allResolutions).map((res) => ({
      label: res,
      value: res,
    }));
  }

  // 从 durationResolutionMap 生成 durationOptions
  const allDurations = new Set<number>();
  modelConfig.durationResolutionMap.forEach((map) => {
    map.duration.forEach((dur) => allDurations.add(dur));
  });
  const durationArray = Array.from(allDurations).sort((a, b) => a - b);

  let durationOptions: { label: string; value: number }[] | undefined;
  let durationRange: { min: number; max: number; step: number } | undefined;

  if (durationArray.length <= 5) {
    durationOptions = durationArray.map((dur) => ({
      label: `${dur}秒`,
      value: dur,
    }));
  } else {
    durationRange = {
      min: Math.min(...durationArray),
      max: Math.max(...durationArray),
      step: 1,
    };
  }

  // 根据 type 确定 maxImages
  let maxImages = 1;
  if (modelConfig.type.includes("multiImage")) {
    maxImages = 9;
  } else if (modelConfig.type.includes("startEndRequired") || modelConfig.type.includes("endFrameOptional")) {
    maxImages = 2;
  }

  return {
    label: manufacturerLabels[modelConfig.manufacturer] || modelConfig.manufacturer,
    value: modelConfig.manufacturer,
    modes,
    defaultMode: modes[0]?.value || "single",
    resolutions,
    defaultResolution: resolutions[0]?.value || "",
    resolutionLabel,
    durationOptions,
    durationRange,
    durationTip: durationRange ? `${durationRange.min}-${durationRange.max}秒` : undefined,
    maxImages,
  };
}

// 获取厂商配置（优先使用新的模型配置系统）
export function getManufacturerConfig(manufacturer: string, model?: string): ManufacturerConfig {
  // 如果提供了 model，尝试从 modelList 获取配置
  if (model) {
    const modelConfig = getModelConfig(model, manufacturer);

    if (modelConfig) {
      return getModelBasedConfig(modelConfig);
    }
  }

  // 回退到旧的静态配置

  return manufacturerConfigs[manufacturer] || manufacturerConfigs.volcengine;
}

// 获取厂商标签
export function getManufacturerLabel(manufacturer: string): string {
  return manufacturerLabels[manufacturer] || manufacturer;
}

// 获取模式标签
export function getModeLabel(mode: string): string {
  return modeLabels[mode] || mode;
}

// 获取模式选项（支持模型参数）
export function getModeOptions(manufacturer: string, model?: string) {
  // 如果是 "other" 厂商，返回所有模式
  if (manufacturer === "other") {
    return [
      { label: modeLabels["text"], value: "text" },
      { label: modeLabels["single"], value: "single" },
      { label: modeLabels["startEnd"], value: "startEnd" },
      { label: modeLabels["multi"], value: "multi" },
    ];
  }
  return getManufacturerConfig(manufacturer, model).modes;
}

// 获取分辨率标签（支持模型参数）
export function getResolutionLabel(manufacturer: string, model?: string): string {
  return getManufacturerConfig(manufacturer, model).resolutionLabel;
}

// 获取分辨率选项（支持模型参数）
export function getResolutionOptions(manufacturer: string, model?: string) {
  return getManufacturerConfig(manufacturer, model).resolutions;
}

// 获取默认分辨率（支持模型参数）
export function getDefaultResolution(manufacturer: string, model?: string): string {
  return getManufacturerConfig(manufacturer, model).defaultResolution;
}

// 获取默认模式（支持模型参数）
export function getDefaultMode(manufacturer: string, model?: string): string {
  return getManufacturerConfig(manufacturer, model).defaultMode;
}

// 获取默认时长（支持模型参数）
export function getDefaultDuration(manufacturer: string, model?: string): number {
  const config = getManufacturerConfig(manufacturer, model);
  if (config.durationOptions && config.durationOptions.length > 0) {
    return config.durationOptions[0].value;
  }
  return config.durationRange?.min || 5;
}

// 获取时长选项（支持模型参数）
export function getDurationOptions(manufacturer: string, model?: string) {
  return getManufacturerConfig(manufacturer, model).durationOptions || [];
}

// 获取时长范围（支持模型参数）
export function getDurationRange(manufacturer: string, model?: string) {
  return getManufacturerConfig(manufacturer, model).durationRange || { min: 1, max: 20, step: 1 };
}

// 获取时长提示（支持模型参数）
export function getDurationTip(manufacturer: string, model?: string): string {
  return getManufacturerConfig(manufacturer, model).durationTip || "";
}

// 获取最大图片数（支持模型参数）
export function getMaxImages(manufacturer: string, model?: string): number {
  return getManufacturerConfig(manufacturer, model).maxImages;
}

// 获取模型是否支持音频（支持模型参数）
export function getAudioSupport(manufacturer: string, model?: string): boolean {
  // other 厂商默认支持音频
  if (manufacturer === "other") {
    return true;
  }

  // 如果提供了 model，从 modelList 获取配置
  if (model) {
    const modelConfig = getModelConfig(model, manufacturer);
    if (modelConfig) {
      return modelConfig.audio;
    }
  }

  // 检查该厂商是否有任何模型支持音频
  const manufacturerModels = modelList.filter((m) => m.manufacturer === manufacturer);
  return manufacturerModels.some((m) => m.audio);
}
