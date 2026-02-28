export interface DurationOption {
  value: number;
  label: string;
}
export type ManufacturerType = "volcengine" | "runninghub";
export interface ResolutionOption {
  value: string;
  label: string;
}

export interface RatioOption {
  value: string;
  label: string;
}

export interface ManufacturerConfig {
  value: string;
  label: string;
  maxImages: number; // 最大图片数量
  minImages: number; // 最小图片数量
  durationOptions: DurationOption[];
  resolutionOptions: ResolutionOption[];
  ratioOptions?: RatioOption[];
  defaultDuration: number;
  defaultResolution: string;
  defaultRatio?: string;
  validateDuration: (duration: number) => boolean;
  validateImages: (count: number) => boolean;
  requiresPrompt?: boolean; // 是否必须提示词
  requiresRatio?: boolean; // 是否需要宽高比
}

export interface VideoFormData {
  model: string;
  scriptId: number;
  videoImgs: string[];
  filePath: string;
  prompt: string;
  duration: number;
  resolution: string;
  ratio?: string;
  generateVideos: { id?: number; filePath: string }[];
}
