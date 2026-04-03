//如需遥测AI请使用在toonflow安装目录运行npx @ai-sdk/devtools （要求在其他设置中打开遥测功能，且toonflow有权限在安装目录创建.devtools文件夹）
// ==================== 类型定义 ====================
// 文本模型
interface TextModel {
  name: string; // 显示名称
  modelName: string;
  type: "text";
  think: boolean; // 前端显示用
}

// 图像模型
interface ImageModel {
  name: string; // 显示名称
  modelName: string;
  type: "image";
  mode: ("text" | "singleImage" | "multiReference")[];
  associationSkills?: string; // 关联技能，多个技能用逗号分隔
}
// 视频模型
interface VideoModel {
  name: string; // 显示名称
  modelName: string; //全局唯一
  type: "video";
  mode: (
    | "singleImage" // 单图
    | "startEndRequired" // 首尾帧（两张都得有）
    | "endFrameOptional" // 首尾帧（尾帧可选）
    | "startFrameOptional" // 首尾帧（首帧可选）
    | "text" // 文本生视频
    | ("videoReference" | "imageReference" | "audioReference" | "textReference")[]
  )[]; // 混合参考
  associationSkills?: string; // 关联技能，多个技能用逗号分隔
  audio: "optional" | false | true; // 音频配置
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}

interface TTSModel {
  name: string; // 显示名称
  modelName: string;
  type: "tts";
  voices: {
    title: string; //显示名称
    voice: string; //说话人
  }[];
}
// 供应商配置
interface VendorConfig {
  id: string; //供应商唯一标识，必须全局唯一
  author: string;
  description?: string; //md5格式
  name: string;
  icon?: string; //仅支持base64格式
  inputs: {
    key: string;
    label: string;
    type: "text" | "password" | "url";
    required: boolean;
    placeholder?: string;
  }[];
  inputValues: Record<string, string>;
  models: (TextModel | ImageModel | VideoModel)[];
}
// ==================== 全局工具函数 ====================
//Axios实例
//压缩图片大小(1MB = 1 * 1024 * 1024)
declare const zipImage: (completeBase64: string, size: number) => Promise<string>;
//压缩图片分辨率
declare const zipImageResolution: (completeBase64: string, width: number, height: number) => Promise<string>;
//多图拼接乘单图 maxSize  最大输出大小，默认为 10mb
declare const mergeImages: (completeBase64: string[], maxSize?: string) => Promise<string>;
//Url转Base64
declare const urlToBase64: (url: string) => Promise<string>;
//轮询函数
declare const pollTask: (
  fn: () => Promise<{ completed: boolean; data?: string; error?: string }>,
  interval?: number,
  timeout?: number,
) => Promise<{ completed: boolean; data?: string; error?: string }>;
declare const axios: any;
declare const createOpenAI: any;
declare const createDeepSeek: any;
declare const createZhipu: any;
declare const createQwen: any;
declare const createAnthropic: any;
declare const createOpenAICompatible: any;
declare const createXai: any;
declare const createMinimax: any;
declare const createGoogleGenerativeAI: any;
declare const logger: (logstring: string) => void;
declare const jsonwebtoken: any;

// ==================== 供应商数据 ====================
const vendor: VendorConfig = {
  id: "openai",
  author: "Toonflow",
  description: "OpenAI标准格式接口，您可以修改请求地址并手动添加缺失的模型。",
  name: "OpenAI标准接口",
  icon: "",
  inputs: [
    { key: "apiKey", label: "API密钥", type: "password", required: true },
    { key: "baseUrl", label: "请求地址", type: "url", required: true, placeholder: "以v1结束，示例：https://api.openai.com/v1" },
  ],
  inputValues: {
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
  },
  models: [
    {
      name: "GPT-4o",
      modelName: "gpt-4o",
      type: "text",
      think: false,
    },
  ],
};
exports.vendor = vendor;

// ==================== 适配器函数 ====================

// 文本请求函数
const textRequest: (textModel: TextModel) => { url: string; model: string } = (textModel) => {
  if (!vendor.inputValues.apiKey) throw new Error("缺少API Key");
  const apiKey = vendor.inputValues.apiKey.replace("Bearer ", "");

  return createOpenAI({
    baseURL: vendor.inputValues.baseUrl,
    apiKey: apiKey,
  }).chat(textModel.modelName);
};
exports.textRequest = textRequest;

//图片请求函数
interface ImageConfig {
  prompt: string; //图片提示词
  imageBase64: string[]; //输入的图片提示词
  size: "1K" | "2K" | "4K"; // 图片尺寸
  aspectRatio: `${number}:${number}`; // 长宽比
}
const imageRequest = async (imageConfig: ImageConfig, imageModel: ImageModel) => {
  return null;
};
exports.imageRequest = imageRequest;

interface VideoConfig {
  duration: number;
  resolution: string;
  aspectRatio: "16:9" | "9:16";
  prompt: string;
  imageBase64?: string[];
  audio?: boolean;
  mode:
    | "singleImage" // 单图
    | "multiImage" // 多图模式
    | "gridImage" // 网格单图（传入一张图片，但该图片是网格图）
    | "startEndRequired" // 首尾帧（两张都得有）
    | "endFrameOptional" // 首尾帧（尾帧可选）
    | "startFrameOptional" // 首尾帧（首帧可选）
    | "text" // 文本生视频
    | ("video" | "image" | "audio" | "text")[]; // 混合参考
}

const videoRequest = async (videoConfig: VideoConfig, videoModel: VideoModel) => {
  return null;
};
exports.videoRequest = videoRequest;

interface TTSConfig {
  text: string;
  voice: string;
  speechRate: number;
  pitchRate: number;
  volume: number;
}
const ttsRequest = async (ttsConfig: TTSConfig, ttsModel: TTSModel) => {
  return null;
};
exports.ttsRequest = ttsRequest;
