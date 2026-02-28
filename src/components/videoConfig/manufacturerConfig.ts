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
  other: "其他",
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
// 视频模型列表
// export const modelList: ModelConfig[] = [
//   {
//     manufacturer: "other",
//     model: "",
//     durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p", "1080p"] }],
//     aspectRatio: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
//     type: ["text", "endFrameOptional", "singleImage", "multiImage"],
//     audio: true,
//   },
//   // ================== 火山引擎/豆包系列 ==================
//   // doubao-seedance-1-5-pro 文生视频/图生视频
//   {
//     manufacturer: "volcengine",
//     model: "doubao-seedance-1-5-pro-251215",
//     durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
//     aspectRatio: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
//     type: ["text", "endFrameOptional"],
//     audio: true,
//   },
//   // doubao-seedance-1-0-pro 文生视频/图生视频
//   {
//     manufacturer: "volcengine",
//     model: "doubao-seedance-1-0-pro-250528",
//     durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
//     aspectRatio: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
//     type: ["text", "endFrameOptional"],
//     audio: false,
//   },
//   // doubao-seedance-1-0-pro-fast 文生视频/图生视频
//   {
//     manufacturer: "volcengine",
//     model: "doubao-seedance-1-0-pro-fast-251015",
//     durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
//     aspectRatio: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
//     type: ["text", "singleImage"],
//     audio: false,
//   },
//   // doubao-seedance-1-0-lite-i2v 图生视频（仅支持图片模式）
//   {
//     manufacturer: "volcengine",
//     model: "doubao-seedance-1-0-lite-i2v-250428",
//     durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
//     aspectRatio: [],
//     type: ["endFrameOptional", "reference"],
//     audio: false,
//   },
//   // doubao-seedance-1-0-lite-t2v 文生视频（仅支持文本模式）
//   {
//     manufacturer: "volcengine",
//     model: "doubao-seedance-1-0-lite-t2v-250428",
//     durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
//     aspectRatio: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
//     type: ["text"],
//     audio: false,
//   },
//   // ================== 可灵系列 ==================
//   // kling-v1(STD) 文生视频
//   {
//     manufacturer: "kling",
//     model: "kling-v1(STD)",
//     durationResolutionMap: [{ duration: [5, 10], resolution: ["720p"] }],
//     aspectRatio: ["16:9", "1:1", "9:16"],
//     type: ["text"],
//     audio: false,
//   },
//   // kling-v1(STD) 图生视频
//   {
//     manufacturer: "kling",
//     model: "kling-v1(STD)",
//     durationResolutionMap: [{ duration: [5, 10], resolution: ["720p"] }],
//     aspectRatio: [],
//     type: ["startEndRequired"],
//     audio: false,
//   },
//   // kling-v1(PRO) 文生视频
//   {
//     manufacturer: "kling",
//     model: "kling-v1(PRO)",
//     durationResolutionMap: [{ duration: [5, 10], resolution: ["1080p"] }],
//     aspectRatio: ["16:9", "1:1", "9:16"],
//     type: ["text"],
//     audio: false,
//   },
//   // kling-v1(PRO) 图生视频
//   {
//     manufacturer: "kling",
//     model: "kling-v1(PRO)",
//     durationResolutionMap: [{ duration: [5, 10], resolution: ["1080p"] }],
//     aspectRatio: [],
//     type: ["startEndRequired"],
//     audio: false,
//   },
//   // kling-v1-6(PRO) 文生视频
//   {
//     manufacturer: "kling",
//     model: "kling-v1-6(PRO)",
//     durationResolutionMap: [{ duration: [5, 10], resolution: ["1080p"] }],
//     aspectRatio: ["16:9", "1:1", "9:16"],
//     type: ["text"],
//     audio: false,
//   },
//   // kling-v1-6(PRO) 图生视频
//   {
//     manufacturer: "kling",
//     model: "kling-v1-6(PRO)",
//     durationResolutionMap: [{ duration: [5, 10], resolution: ["1080p"] }],
//     aspectRatio: [],
//     type: ["startEndRequired"],
//     audio: false,
//   },
//   // kling-v2-5-turbo(PRO) 文生视频
//   {
//     manufacturer: "kling",
//     model: "kling-v2-5-turbo(PRO)",
//     durationResolutionMap: [{ duration: [5, 10], resolution: ["1080p"] }],
//     aspectRatio: ["16:9", "1:1", "9:16"],
//     type: ["text"],
//     audio: false,
//   },
//   // kling-v2-5-turbo(PRO) 图生视频
//   {
//     manufacturer: "kling",
//     model: "kling-v2-5-turbo(PRO)",
//     durationResolutionMap: [{ duration: [5, 10], resolution: ["1080p"] }],
//     aspectRatio: [],
//     type: ["startEndRequired"],
//     audio: false,
//   },
//   // kling-v2-6(PRO) 文生视频
//   {
//     manufacturer: "kling",
//     model: "kling-v2-6(PRO)",
//     durationResolutionMap: [{ duration: [5, 10], resolution: ["1080p"] }],
//     aspectRatio: ["16:9", "1:1", "9:16"],
//     type: ["text"],
//     audio: false,
//   },
//   // kling-v2-6(PRO) 图生视频
//   {
//     manufacturer: "kling",
//     model: "kling-v2-6(PRO)",
//     durationResolutionMap: [{ duration: [5, 10], resolution: ["1080p"] }],
//     aspectRatio: [],
//     type: ["startEndRequired"],
//     audio: false,
//   },
//   // ================== ViduQ3系列 ==================
//   // viduq3-pro 文生视频
//   {
//     manufacturer: "vidu",
//     model: "viduq3-pro",
//     durationResolutionMap: [{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], resolution: ["540p", "720p", "1080p"] }],
//     aspectRatio: ["16:9", "9:16", "3:4", "4:3", "1:1"],
//     type: ["text"],
//     audio: true,
//   },
//   // viduq3-pro 图生视频
//   {
//     manufacturer: "vidu",
//     model: "viduq3-pro",
//     durationResolutionMap: [{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], resolution: ["540p", "720p", "1080p"] }],
//     aspectRatio: [],
//     type: ["singleImage"],
//     audio: true,
//   },
//   // viduq2-pro-fast 图生视频
//   {
//     manufacturer: "vidu",
//     model: "viduq2-pro-fast",
//     durationResolutionMap: [{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], resolution: ["720p", "1080p"] }],
//     aspectRatio: [],
//     type: ["singleImage", "startEndRequired"],
//     audio: false,
//   },
//   // viduq2-pro 文生视频
//   {
//     manufacturer: "vidu",
//     model: "viduq2-pro",
//     durationResolutionMap: [{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], resolution: ["540p", "720p", "1080p"] }],
//     aspectRatio: ["16:9", "9:16", "3:4", "4:3", "1:1"],
//     type: ["text"],
//     audio: false,
//   },
//   // viduq2-pro 图生视频
//   {
//     manufacturer: "vidu",
//     model: "viduq2-pro",
//     durationResolutionMap: [{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], resolution: ["540p", "720p", "1080p"] }],
//     aspectRatio: [],
//     type: ["singleImage", "reference", "startEndRequired"],
//     audio: false,
//   },
//   // viduq2-turbo 文生视频
//   {
//     manufacturer: "vidu",
//     model: "viduq2-turbo",
//     durationResolutionMap: [{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], resolution: ["540p", "720p", "1080p"] }],
//     aspectRatio: ["16:9", "9:16", "3:4", "4:3", "1:1"],
//     type: ["text"],
//     audio: false,
//   },
//   // viduq2-turbo 图生视频
//   {
//     manufacturer: "vidu",
//     model: "viduq2-turbo",
//     durationResolutionMap: [{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], resolution: ["540p", "720p", "1080p"] }],
//     aspectRatio: [],
//     type: ["singleImage", "reference", "startEndRequired"],
//     audio: false,
//   },
//   // viduq1 文生视频
//   {
//     manufacturer: "vidu",
//     model: "viduq1",
//     durationResolutionMap: [{ duration: [5], resolution: ["1080p"] }],
//     aspectRatio: ["16:9", "9:16", "1:1"],
//     type: ["text"],
//     audio: false,
//   },
//   // viduq1 图生视频
//   {
//     manufacturer: "vidu",
//     model: "viduq1",
//     durationResolutionMap: [{ duration: [5], resolution: ["1080p"] }],
//     aspectRatio: [],
//     type: ["singleImage", "reference", "startEndRequired"],
//     audio: false,
//   },
//   // viduq1-classic 图生视频
//   {
//     manufacturer: "vidu",
//     model: "viduq1-classic",
//     durationResolutionMap: [{ duration: [5], resolution: ["1080p"] }],
//     aspectRatio: [],
//     type: ["singleImage", "startEndRequired"],
//     audio: false,
//   },
//   // vidu2.0 图生视频
//   {
//     manufacturer: "vidu",
//     model: "vidu2.0",
//     durationResolutionMap: [
//       { duration: [4], resolution: ["360p", "720p", "1080p"] },
//       { duration: [8], resolution: ["720p"] },
//     ],
//     aspectRatio: [],
//     type: ["singleImage", "reference", "startEndRequired"],
//     audio: false,
//   },
//   // ================== 万象系列 ==================
//   // wan2.6-t2v 文生视频（有声视频）
//   {
//     manufacturer: "wan",
//     model: "wan2.6-t2v",
//     durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["720p", "1080p"] }],
//     aspectRatio: ["16:9", "9:16", "1:1", "4:3", "3:4"],
//     type: ["text"],
//     audio: true,
//   },
//   // wan2.5-t2v-preview 文生视频（有声视频）
//   {
//     manufacturer: "wan",
//     model: "wan2.5-t2v-preview",
//     durationResolutionMap: [{ duration: [5, 10], resolution: ["480p", "720p", "1080p"] }],
//     aspectRatio: ["16:9", "9:16", "1:1", "4:3", "3:4"],
//     type: ["text"],
//     audio: true,
//   },
//   // wan2.2-t2v-plus 文生视频（无声视频）
//   {
//     manufacturer: "wan",
//     model: "wan2.2-t2v-plus",
//     durationResolutionMap: [{ duration: [5], resolution: ["480p", "1080p"] }],
//     aspectRatio: ["16:9", "9:16", "1:1", "4:3", "3:4"],
//     type: ["text"],
//     audio: false,
//   },
//   //   // wanx2.1-t2v-turbo 文生视频（无声视频）
//   {
//     manufacturer: "wan",
//     model: "wanx2.1-t2v-turbo",
//     durationResolutionMap: [{ duration: [5], resolution: ["480p", "720p"] }],
//     aspectRatio: ["16:9", "9:16", "1:1", "4:3", "3:4"],
//     type: ["text"],
//     audio: false,
//   },
//   //   // wanx2.1-t2v-plus 文生视频（无声视频）
//   {
//     manufacturer: "wan",
//     model: "wanx2.1-t2v-plus",
//     durationResolutionMap: [{ duration: [5], resolution: ["720p"] }],
//     aspectRatio: ["16:9", "9:16", "1:1", "4:3", "3:4"],
//     type: ["text"],
//     audio: false,
//   },
//   // wan2.6-i2v-flash 图生视频（有声视频&无声视频）
//   {
//     manufacturer: "wan",
//     model: "wan2.6-i2v-flash",
//     durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["720p", "1080p"] }],
//     aspectRatio: [],
//     type: ["singleImage"],
//     audio: true,
//   },
//   // wan2.6-i2v 图生视频（有声视频）
//   {
//     manufacturer: "wan",
//     model: "wan2.6-i2v",
//     durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["720p", "1080p"] }],
//     aspectRatio: [],
//     type: ["singleImage"],
//     audio: true,
//   },
//   // wan2.5-i2v-preview 图生视频（有声视频）
//   {
//     manufacturer: "wan",
//     model: "wan2.5-i2v-preview",
//     durationResolutionMap: [{ duration: [5, 10], resolution: ["480p", "720p", "1080p"] }],
//     aspectRatio: [],
//     type: ["singleImage"],
//     audio: true,
//   },
//   // wan2.2-i2v-flash 图生视频（无声视频）
//   {
//     manufacturer: "wan",
//     model: "wan2.2-i2v-flash",
//     durationResolutionMap: [{ duration: [5], resolution: ["480p", "720p", "1080p"] }],
//     aspectRatio: [],
//     type: ["singleImage"],
//     audio: false,
//   },
//   // wan2.2-i2v-plus 图生视频（无声视频）
//   {
//     manufacturer: "wan",
//     model: "wan2.2-i2v-plus",
//     durationResolutionMap: [{ duration: [5], resolution: ["480p", "1080p"] }],
//     aspectRatio: [],
//     type: ["singleImage"],
//     audio: false,
//   },
//   // wanx2.1-i2v-plus 图生视频（无声视频）
//   {
//     manufacturer: "wan",
//     model: "wanx2.1-i2v-plus",
//     durationResolutionMap: [{ duration: [5], resolution: ["720p"] }],
//     aspectRatio: [],
//     type: ["singleImage"],
//     audio: false,
//   },
//   // wanx2.1-i2v-turbo 图生视频（无声视频）
//   {
//     manufacturer: "wan",
//     model: "wanx2.1-i2v-turbo",
//     durationResolutionMap: [{ duration: [3, 4, 5], resolution: ["480p", "720p"] }],
//     aspectRatio: [],
//     type: ["singleImage"],
//     audio: false,
//   },
//   // wan2.2-kf2v-flash 首尾帧生视频（无声视频）
//   {
//     manufacturer: "wan",
//     model: "wan2.2-kf2v-flash",
//     durationResolutionMap: [{ duration: [5], resolution: ["480p", "720p", "1080p"] }],
//     aspectRatio: [],
//     type: ["startEndRequired"],
//     audio: false,
//   },
//   // wanx2.1-kf2v-plus 首尾帧生视频（无声视频）
//   {
//     manufacturer: "wan",
//     model: "wanx2.1-kf2v-plus",
//     durationResolutionMap: [{ duration: [5], resolution: ["720p"] }],
//     aspectRatio: [],
//     type: ["startEndRequired"],
//     audio: false,
//   },
//   // ================== Gemini Veo 系列 ==================
//   // Veo 3.1 预览版（支持音频）
//   {
//     manufacturer: "gemini",
//     model: "veo-3.1-generate-preview",
//     durationResolutionMap: [
//       { duration: [4, 6], resolution: ["720p"] },
//       { duration: [8], resolution: ["720p", "1080p"] },
//     ],
//     aspectRatio: ["16:9", "9:16"],
//     type: ["text", "singleImage", "startEndRequired", "endFrameOptional", "reference"],
//     audio: true,
//   },
//   // Veo 3.1 Fast 预览版（支持音频）
//   {
//     manufacturer: "gemini",
//     model: "veo-3.1-fast-generate-preview",
//     durationResolutionMap: [
//       { duration: [4, 6], resolution: ["720p"] },
//       { duration: [8], resolution: ["720p", "1080p"] },
//     ],
//     aspectRatio: ["16:9", "9:16"],
//     type: ["text", "singleImage", "startEndRequired", "endFrameOptional", "reference"],
//     audio: true,
//   },
//   // Veo 3 稳定版（支持音频）
//   {
//     manufacturer: "gemini",
//     model: "veo-3.0-generate-preview",
//     durationResolutionMap: [
//       { duration: [4, 6], resolution: ["720p"] },
//       { duration: [8], resolution: ["720p", "1080p"] },
//     ],
//     aspectRatio: ["16:9", "9:16"],
//     type: ["text", "singleImage"],
//     audio: true,
//   },
//   // Veo 3 Fast 稳定版（支持音频）
//   {
//     manufacturer: "gemini",
//     model: "veo-3.0-fast-generate-preview",
//     durationResolutionMap: [
//       { duration: [4, 6], resolution: ["720p"] },
//       { duration: [8], resolution: ["720p", "1080p"] },
//     ],
//     aspectRatio: ["16:9", "9:16"],
//     type: ["text", "singleImage"],
//     audio: true,
//   },
//   // Veo 2 稳定版（无音频）
//   {
//     manufacturer: "gemini",
//     model: "veo-2.0-generate-001",
//     durationResolutionMap: [{ duration: [5, 6, 7, 8], resolution: ["720p"] }],
//     aspectRatio: ["16:9", "9:16"],
//     type: ["text", "singleImage"],
//     audio: false,
//   },
//   // ================== RunningHub 系列 ==================
//   // sora
//   {
//     manufacturer: "runninghub",
//     model: "sora-2",
//     durationResolutionMap: [{ duration: [10, 15], resolution: [] }],
//     aspectRatio: ["16:9", "9:16"],
//     type: ["multiImage", "text"],
//     audio: false,
//   },
//   // sora 2
//   {
//     manufacturer: "runninghub",
//     model: "sora-2-pro",
//     durationResolutionMap: [{ duration: [15, 25], resolution: [] }],
//     aspectRatio: ["16:9", "9:16"],
//     type: ["multiImage", "text"],
//     audio: false,
//   },
//   // ================== Apimart 系列 ==================
//   // // sora
//   // {
//   //   manufacturer: "apimart",
//   //   model: "sora-2",
//   //   durationResolutionMap: [{ duration: [10, 15], resolution: [] }],
//   //   aspectRatio: ["16:9", "9:16"],
//   //   type: ["multiImage", "text"],
//   //   audio: false,
//   // },
//   // // sora 2
//   // {
//   //   manufacturer: "apimart",
//   //   model: "sora-2-pro",
//   //   durationResolutionMap: [{ duration: [15, 25], resolution: [] }],
//   //   aspectRatio: ["16:9", "9:16"],
//   //   type: ["multiImage", "text"],
//   //   audio: false,
//   // },
// ];

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
      map.resolution.forEach((res) => allResolutions.add(res));
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
  // apimart: generateManufacturerConfig("apimart"),
  other: generateManufacturerConfig("other"),
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
      map.resolution.forEach((res) => allResolutions.add(res));
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
  return getManufacturerConfig(manufacturer, model).durationRange || { min: 5, max: 20, step: 1 };
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
