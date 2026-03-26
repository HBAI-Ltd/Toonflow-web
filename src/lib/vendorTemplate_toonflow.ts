// ==================== 类型定义 ====================
// 文本模型
interface TextModel {
  name: string; // 显示名称
  modelName: string;
  type: "text";
  multimodal: boolean; // 前端显示用
  tool: boolean; // 前端显示用
}

// 图像模型
interface ImageModel {
  name: string; // 显示名称
  modelName: string;
  type: "image";
  mode: ("text" | "singleImage" | "multiReference")[];
}
// 视频模型
interface VideoModel {
  name: string; // 显示名称
  modelName: string; //全局唯一
  type: "video";
  mode: (
    | "singleImage" // 单图
    | "multiImage" // 多图模式
    | "gridImage" // 网格单图（传入一张图片，但该图片是网格图）
    | "startEndRequired" // 首尾帧（两张都得有）
    | "endFrameOptional" // 首尾帧（尾帧可选）
    | "startFrameOptional" // 首尾帧（首帧可选）
    | "text" // 文本生视频
    | ("video" | "image" | "audio" | "text")[] // 混合参考
  )[];
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
  version: number;
  icon?: string; //仅支持base64格式
  name: string;
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

// ==================== 供应商数据 ====================
const vendor: VendorConfig = {
  version: 1,
  name: "Toonflow官方中转平台",
  inputs: [
    { key: "apiKey", label: "API密钥", type: "password", required: true },
    { key: "text", label: "文本", type: "url", required: false },
    { key: "image", label: "图片任务创建", type: "url", required: false, placeholder: "如非必要请勿更改" },
    { key: "imageCreate", label: "异步图片任务创建", type: "url", required: false, placeholder: "如非必要请勿更改" },
    { key: "imageQuery", label: "异步图片任务查询", type: "url", required: false, placeholder: "如非必要请勿更改" },
    { key: "soraVideoCreate", label: "Sora视频任务创建", type: "url", required: false, placeholder: "如非必要请勿更改" },
    { key: "soraVideoQuery", label: "Sora视频任务查询", type: "url", required: false, placeholder: "如非必要请勿更改" },
    { key: "soraVideoDownload", label: "Sora视频文件下载", type: "url", required: false, placeholder: "如非必要请勿更改" },
    { key: "videoCreate", label: "通用视频任务创建", type: "url", required: false, placeholder: "如非必要请勿更改" },
    { key: "videoQuery", label: "通用视频任务查询", type: "url", required: false, placeholder: "如非必要请勿更改" },
  ],
  inputValues: {
    apiKey: "sk-WdEaJIiuT8WUxecni5WiZc5kMuT1jg1NgL2r5VHrozQUeGEf",
    baseUrl: "http://192.168.0.74:33332/v1",
    text: "http://192.168.0.74:33332/v1",
    image: "http://192.168.0.74:33332/v1/images/generations",
    imageCreate: "http://192.168.0.74:33332/imagegenerator/task",
    imageQuery: "http://192.168.0.74:33332/imagegenerator/task/{id}",
    soraVideoCreate: "http://192.168.0.74:33332/v1/videos",
    soraVideoQuery: "http://192.168.0.74:33332/v1/videos/{id}",
    soraVideoDownload: "http://192.168.0.74:33332/v1/videos/{id}/content",
    videoCreate: "http://192.168.0.74:33332/v1/video/generations",
    videoQuery: "http://192.168.0.74:33332/v1/video/generations/{id}",
  },
  models: [
    {
      name: "Sora 2",
      type: "video",
      modelName: "Sora-2-I2V",
      mode: ["singleImage", "text"],
      audio: "optional",
      durationResolutionMap: [{ duration: [4, 8, 12], resolution: ["720x1280", "1280x720", "1024x1792", "1792x1024"] }],
    },
    {
      name: "Seedance 1.5 Pro",
      type: "video",
      modelName: "Seedance-1.5-Pro-NotAudio",
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
      mode: ["text", "endFrameOptional"],
      audio: true,
    },

    {
      name: "vidu2 turbo",
      type: "video",
      modelName: "ViduQ2-turbo",
      durationResolutionMap: [{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], resolution: ["540p", "720p", "1080p"] }],
      mode: ["singleImage", "startEndRequired"],
      audio: false,
    },

    {
      name: "ViduQ3 pro",
      type: "video",
      modelName: "ViduQ3-pro",
      durationResolutionMap: [{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], resolution: ["540p", "720p", "1080p"] }],
      mode: ["singleImage", "startEndRequired"],
      audio: false,
    },

    {
      name: "ViduQ2 pro fast",
      type: "video",
      modelName: "ViduQ2-pro-fast",
      durationResolutionMap: [{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], resolution: ["720p", "1080p"] }],
      mode: ["singleImage", "startEndRequired"],
      audio: false,
    },
    {
      name: "ViduQ2 pro",
      type: "video",
      modelName: "ViduQ2-pro",
      durationResolutionMap: [{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], resolution: ["540p", "720p", "1080p"] }],
      mode: ["singleImage", "startEndRequired"],
      audio: false,
    },

    {
      name: "Wan2.6 T2V",
      type: "video",
      modelName: "Wan2.6-T2V",
      mode: ["text", "singleImage"],
      durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["720p", "1080p"] }],
      audio: true,
    },
    {
      name: "Wan2.6 I2V",
      type: "video",
      modelName: "Wan2.6-I2V",
      mode: ["text", "singleImage"],
      durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["720p", "1080p"] }],
      audio: true,
    },
    {
      name: "Doubao Seedream 5.0 Lite",
      type: "image",
      modelName: "Doubao-Seedream-5.0-Lite",
      mode: ["text", "singleImage", "multiReference"],
    },
    {
      name: "Doubao Seedream 4.5",
      type: "image",
      modelName: "doubao-seedream-4-5-251128",
      mode: ["text", "singleImage", "multiReference"],
    },
    {
      name: "gpt-4.1",
      type: "text",
      modelName: "gpt-4.1",
      multimodal: true, // 前端显示用
      tool: true, // 前端显示用
    },
    {
      name: "claude-sonnet-4-6",
      type: "text",
      modelName: "claude-sonnet-4-6",
      multimodal: true, // 前端显示用
      tool: true, // 前端显示用
    },
    {
      name: "claude-opus-4-5-20251101",
      type: "text",
      modelName: "claude-opus-4-5-20251101",
      multimodal: true, // 前端显示用
      tool: true, // 前端显示用
    },
  ],
};
exports.vendor = vendor;

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

// ==================== 适配器函数 ====================

// 文本请求函数
const textRequest: (textModel: TextModel) => { url: string; model: string } = (textModel) => {
  if (!vendor.inputValues.apiKey) throw new Error("缺少API Key");
  const apiKey = vendor.inputValues.apiKey.replace("Bearer ", "");

  return createOpenAI({
    baseURL: vendor.inputValues.text || "http://192.168.0.74:33332/v1/chat/completions",
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
  if (!vendor.inputValues.apiKey) throw new Error("缺少API Key");
  const apiKey = vendor.inputValues.apiKey.replace("Bearer ", "");

  const size = imageConfig.size === "1K" ? "2K" : imageConfig.size;
  const sizeMap: Record<string, Record<string, string>> = {
    "16:9": {
      "2K": "2848x1600",
      "4K": "4096x2304",
    },
    "9:16": {
      "2K": "1600x2848",
      "4K": "2304x4096",
    },
  };
  
  const body: Record<string, any> = {
    model: imageModel.modelName,
    prompt: imageConfig.prompt,
    size: sizeMap[imageConfig.aspectRatio][size],
    response_format: "url",
    sequential_image_generation: "disabled",
    stream: false,
    watermark: false,
    ...(imageConfig.imageBase64 && { image: imageConfig.imageBase64 }),
  };

  const requestUrl = vendor.inputValues.image || "http://192.168.0.74:33332/v1/images/generations";

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await response.text(); // 获取错误信息
    console.error("请求失败，状态码:", response.status, ", 错误信息:", errorText);
    throw new Error(`请求失败，状态码: ${response.status}, 错误信息: ${errorText}`);
  }
  const data = await response.json();
  return data.data[0].url;
};
exports.imageRequest = imageRequest;

interface VideoConfig {
  duration: number;
  resolution: string;
  aspectRatio: "16:9" | "9:16";
  prompt: string;
  imageBase64?: string[];
  audio?: boolean;
  mode: "startEnd" | "multi" | "single" | "text";
  taskClass: string;
  name: string;
  projectId: number;
}

// 构建 各个平台的metadata参数
const buildDoubaoMetadata = (videoConfig: VideoConfig) => {
  const metaData = {
    ...(typeof videoConfig.audio == "boolean" && { generate_audio: videoConfig.audio ?? false }),
    ratio: videoConfig.aspectRatio,
    image_roles: [],
  };
  if (videoConfig.imageBase64 && videoConfig.imageBase64.length) {
    videoConfig.imageBase64.forEach((i, index) => {
      if (videoConfig.mode == "startEnd") {
        (metaData.image_roles as string[]).push(index == 0 ? "first_frame" : "last_frame");
      }
      if (videoConfig.mode == "single" || videoConfig.mode == "multi") {
        (metaData.image_roles as string[]).push("reference_image");
      }
    });
  }

  return metaData;
};

const buildWanMetadata = (videoConfig: VideoConfig) => {
  const images = videoConfig.imageBase64 ?? [];
  const metaData: Record<string, string | boolean> = {};
  if (videoConfig.mode === "startEnd" && images.length) {
    if (images[0]) metaData.first_frame_url = images[0];
    if (images[1]) metaData.last_frame_url = images[1];
  } else if (images.length === 1) {
    metaData.img_url = images[0]!;
  }
  if (typeof videoConfig.audio == "boolean") {
    metaData.audio = videoConfig.audio;
  }
  return metaData;
};
const buildViduMetadata = (videoConfig: VideoConfig) => ({
  aspect_ratio: videoConfig.aspectRatio,
  audio: videoConfig.audio ?? false,
  off_peak: false,
});

type MetadataBuilder = (config: VideoConfig) => Record<string, any>;
const METADATA_BUILDERS: Array<[string, MetadataBuilder]> = [
  ["doubao", buildDoubaoMetadata],
  ["wan", buildWanMetadata],
  ["vidu", buildViduMetadata],
  ["seedance", buildViduMetadata],
];
const buildModelMetadata = (modelName: string, videoConfig: VideoConfig) => {
  const lowerName = modelName.toLowerCase();
  const match = METADATA_BUILDERS.find(([key]) => lowerName.includes(key));
  return match ? match[1](videoConfig) : {};
};

const videoRequest = async (videoConfig: VideoConfig, videoModel: VideoModel) => {
  if (!vendor.inputValues.apiKey) throw new Error("缺少API Key");
  const apiKey = vendor.inputValues.apiKey.replace("Bearer ", "");

  if (videoModel.modelName == "Sora-2-I2V") {
    const sizeMap: Record<string, string> = {
      "16:9": "1280x720",
      "9:16": "720x1280",
    };
    const body = new FormData();
    body.append("model", videoModel.modelName);
    body.append("prompt", videoConfig.prompt);
    body.append("seconds", String(videoConfig.duration));

    const size = sizeMap[videoConfig.aspectRatio] || "1280x720";
    body.append("size", size);
    if (videoConfig.imageBase64 && videoConfig.imageBase64.length) {
      const [width, height] = size.split("x").map(Number);
      const imageB64 = await zipImageResolution(videoConfig.imageBase64[0]!, width, height);
      body.append("input_reference", Buffer.from(imageB64, "base64"), { filename: "image.jpg", contentType: "image/jpeg" });
    }
    const requestUrl = vendor.inputValues.soraVideoCreate || "http://192.168.0.74:33332/v1/videos";
    const queryUrl = vendor.inputValues.soraVideoQuery || "http://192.168.0.74:33332/v1/videos/{id}";
    const downloadUrl = vendor.inputValues.soraVideoDownload || "http://192.168.0.74:33332/v1/videos/{id}/content";
    const response = await axios.post(requestUrl, body, {
      headers: { Authorization: `Bearer ${apiKey}`, ...body.getHeaders() },
    });
    const { data } = response;
    const taskId = data.id ?? data.taskId ?? data.task_id ?? data.data;
    if (!taskId) throw new Error(`任务提交失败: ${data ? JSON.stringify(data) : "未知错误"}`);

    const downloadVideo = async (url: string) => {
      const res = await fetch(downloadUrl.replace("{id}", url), {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const errorText = await res.text(); // 获取错误信息
        throw new Error(`HTTP error: Status:${res.status}；msg：${errorText}`);
      }
      return Buffer.from(await res.arrayBuffer());
    };

    const res = await pollTask(async () => {
      const queryResponse = await fetch(queryUrl.replace("{id}", taskId), {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      });
      if (!queryResponse.ok) {
        const errorText = await queryResponse.text(); // 获取错误信息
        console.error("请求失败，状态码:", queryResponse.status, ", 错误信息:", errorText);
        throw new Error(`请求失败，状态码: ${queryResponse.status}, 错误信息: ${errorText}`);
      }
      const queryData = await queryResponse.json();
      const status = queryData?.status ?? queryData?.data?.status;
      const fail_reason = queryData?.data?.fail_reason ?? queryData?.data;
      switch (status) {
        case "completed":
        case "SUCCESS":
        case "success":
          const buffer = await downloadVideo(taskId);
          return { completed: true, data: buffer.toString("base64") };
        case "FAILURE":
          return { completed: false, error: fail_reason || "视频生成失败" };
        default:
          return { completed: false };
      }
    });
    if (res.error) throw new Error(res.error);
    return res.data;
  } else {
    // 构建每个模型对应的附加参数
    const metadata = buildModelMetadata(videoModel.modelName, videoConfig);

    //公共请求参数
    const publicBody = {
      model: videoModel.modelName,
      ...(videoConfig.imageBase64 && videoConfig.imageBase64.length ? { images: videoConfig.imageBase64 } : {}),
      prompt: videoConfig.prompt,
      size: videoConfig.resolution,
      duration: videoConfig.duration,
      metadata: metadata,
    };

    if (videoModel.modelName.toLocaleLowerCase().includes("wan")) {
      const sizeMap: Record<string, Record<string, string>> = {
        "480p": {
          "16:9": "832*480",
          "9:16": "480*832",
        },
        "720p": {
          "16:9": "1280*720",
          "9:16": "720*1280",
        },
        "1080p": {
          "16:9": "1920*1080",
          "9:16": "1080*1920",
        },
      };
      const size = sizeMap[videoConfig.resolution]?.[videoConfig.aspectRatio];
      publicBody.size = size;
    }
    const requestUrl = vendor.inputValues.videoCreate || "http://192.168.0.74:33332/v1/video/generations";
    const queryUrl = vendor.inputValues.videoQuery || "http://192.168.0.74:33332/v1/video/generations/{id}";
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(publicBody),
    });
    if (!response.ok) {
      const errorText = await response.text(); // 获取错误信息
      console.error("请求失败，状态码:", response.status, ", 错误信息:", errorText);
      throw new Error(`请求失败，状态码: ${response.status}, 错误信息: ${errorText}`);
    }
    const data = await response.json();
    const taskId = data.id;
    const res = await pollTask(async () => {
      const queryResponse = await fetch(queryUrl.replace("{id}", taskId), {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      });
      if (!queryResponse.ok) {
        const errorText = await queryResponse.text(); // 获取错误信息
        console.error("请求失败，状态码:", queryResponse.status, ", 错误信息:", errorText);
        throw new Error(`请求失败，状态码: ${queryResponse.status}, 错误信息: ${errorText}`);
      }
      const queryData = await queryResponse.json();
      const status = queryData?.status ?? queryData?.data?.status;
      const fail_reason = queryData?.data?.fail_reason ?? queryData?.data;
      switch (status) {
        case "completed":
        case "SUCCESS":
        case "success":
          return { completed: true, data: queryData.data.result_url };
        case "FAILURE":
          return { completed: false, error: fail_reason || "视频生成失败" };
        default:
          return { completed: false };
      }
    });
    if (res.error) throw new Error(res.error);
    return res.data;
  }
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
