/**
 * Vite 环境变量类型定义
 */
interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  // 可以根据需要添加自定义环境变量
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface BackendRuntimeConfig {
  baseUrl: string;
  wsBaseUrl: string;
}

interface Window {
  electronRuntime?: {
    getBackendConfig: () => Promise<BackendRuntimeConfig>;
  };
}

/**
 * 项目实体
 */
interface Project {
  id?: string;
  name?: string;
  intro?: string | null;
  type: string | null;
  artStyle: string | null;
  videoRatio: string | null;
  userId?: number | null;
  createTime?: number;
  updatedAt?: number;
  projectType: string | null;
}
interface GlobalSetting {
  aspectRatio: string; // 影片比例，例如 "16:9"
  style: string; // 画风，比如 "写实", "动漫", 未设置时可为 ""
  colorScheme: string; // 色彩方案，如 "暖色", 未设置时可为 ""
  musicStyle: string; // 音乐风格，如 "流行", 未设置时可为 ""
  type: string; // 小说类型
}
interface ModelDataType {
  model: string;
  apiKey: string;
  baseURL: string;
}
interface ModalSetting {
  languageModel: ModelDataType; // 语言模型名称
  imageModel: ModelDataType; // 图像模型名称
  videoModel: ModelDataType; // 视频模型名称
  audioModel: ModelDataType; // 音频模型名称
  plotAgentModel: ModelDataType;
}
/**
 * 项目的详细包装数据
 */
interface ProjectData {
  /** 小说原文（可选） */
  novelText?: string;
  /** 每集长度（可选） */
  episodeLength?: number;
  /** 集数（可选） */
  episodeCount?: number;
  /** 故事摘要（可选） */
  summary?: string;
  /** 角色列表（可选） */
  characters?: Character[];
  /** 事件列表（可选） */
  events?: Event[];
  /** 剧本列表（可选） */
  scripts?: Script[];
  /** 分镜列表（可选） */
  storyboards?: Storyboard[];
  /** 视频列表（可选） */
  videos?: Video[];
}

/**
 * 角色实体
 */
interface Character {
  id?: number; // 主键id
  name: string; // 名称
  gender: string; // 性别
  appearance: string; // 外貌特征
  personality: string; // 角色性格
  intro: string; // 角色描述
  timbre?: string; // 音色描述
  age?: string; // 年龄段
  voicePath?: string; // 角色音频
  type: string; // 角色类型，如主角、配角
  relation: string; // 角色关系
  filePath?: string; // 人设图片
  projectId?: number; // 项目表id
  eventId?: number; // 事件表id
  generatedId?: string; // ai生成id
}
interface ProjectElement {
  id: number;
  type: string;
  name: string;
  description: string;
  prompt: string;
  remark: string;
  imageUrl: string;
}
/**
 * 事件实体
 */
interface Event {
  /** 事件唯一标识 */
  id: number;
  /** 事件标题 */
  name: string;
  /** 所属集数 */
  scope: number;
  /** 事件描述 */
  description: string;
  // 角色
  role: string;
  /** 事件情感分数，用于刻画情感强度 */
  emotionalIndex: number;
  //状态
  state: "已完成" | "进行中" | "未开始";
  //背景
  novelBack: string;
  //归属项目id
  projectId: number;
  //ai生成的id
  generatedId?: string;
}
interface UploadFile {
  file?: File;
  name: string;
  url?: string;
}
/**
 * 剧本实体
 */
interface Script {
  /** 剧本唯一标识 */
  id: string;
  name?: string;
  /** 所属集数 */
  episode: number;
  /** 剧本标题 */
  title: string;
  /** 剧本内容 */
  content: string;
  /** 包含场景数 */
  scenes: number;
  event?: string;
}

/**
 * 分镜实体
 */
interface Storyboard {
  id: number;
  imageUrl: string;
  intro: string;
  name: string;
  imgPrompt: string;
  videoPrompt: string;
}
interface RoleData {
  id: number;
  name: string;
  personality: string;
  type: string;
  relation: string;
  generatedId: string;
  deressIntro: DressIntro[];
}
interface Props {
  id: number;
  name: string;
  content: string;
  type: string;
  prompt: string;
  remark: string;
  scriptId: number;
  projectId: number;
  imageUrl: string;
}
interface Scenes {
  id: number;
  imageUrl: string;
  intro: string;
  name: string;
  imgPrompt: string;
  videoPrompt: string;
}
interface DressIntro {
  intro: string;
  filePath: string;
}
/**
 * 视频实体
 */
interface Video {
  /** 视频唯一标识 */
  id: string;
  /** 所属分镜ID */
  storyboardId: string;
  /** 视频制作状态 */
  status: "pending" | "processing" | "completed" | "failed";
  /** 视频URL（可选，制作完成后有） */
  url?: string;
  /** 制作进度（0~100） */
  progress: number;
}

// interface Character {
//   name: string;
//   relationship: string;
//   type: string;
//   sex: "男" | "女" | "其他";
//   id: string;
// }
interface EventType {
  chapter: string;
  name: string;
  detail: string;
  state: "已完成" | "进行中" | "未开始";
  id?: string;
  users: {
    name: string;
    id?: string;
    feature: string;
  }[];
  novelBack: string;
  emotionalIndex?: number;
}

// Vite 环境变量类型声明
interface ImportMetaEnv {
  BASE_URL: string | undefined;
  readonly VITE_TYPE: string;
  readonly VITE_BASE_URL: string;
  readonly VITE_WS_URL: string;
  // 在这里添加其他环境变量
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
