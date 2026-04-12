type ReferenceType = "videoReference" | "imageReference" | "audioReference" | "textReference";
type Type = "imageReference" | "startImage" | "endImage" | "videoReference" | "audioReference";
type VideoMode = "singleImage" | "startEndRequired" | "endFrameOptional" | "startFrameOptional" | "text" | ReferenceType[];

interface UploadItemBase {
  fileType: "image" | "video" | "audio";
  id: number | null;
  src?: string;
  prompt?: string;
}

interface UploadItemStoryboard extends UploadItemBase {
  sources: "storyboard";
  index: number;
}
interface VideoModel {
  name: string;
  modelName: string;
  type: "video";
  mode: VideoMode[];
  associationSkills?: string;
  audio: "optional" | false | true;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}
interface UploadItemAssets extends UploadItemBase {
  sources: "assets";
}

type UploadItem = UploadItemStoryboard | UploadItemAssets;

interface StoryboardItem {
  src: string;
  createTime?: number | null;
  duration?: string | null;
  flowId?: number | null;
  id: number;
  index: number;
  projectId?: number | null;
  prompt?: string | null;
  reason?: string | null;
  scriptId?: number | null;
  state?: string | null;
  trackId?: number | null;
}

interface TrackItem {
  id: number;
  prompt: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  reason?: string;
  selectVideoId?: number | null;
  medias: TrackMedia[];
  videoList: VideoItem[];
  duration: number;
}

interface VideoItem {
  id: number;
  src: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  errorReason?: string | null;
}
interface TrackMediaBase {
  src: string;
  id?: number;
  prompt?: string;
  fileType: "image" | "video" | "audio";
  slotType?: Type; // 本地保存时记录的 slot 类型，用于切换轨道时精确还原位置
  index?: number;
}

interface TrackMediaStoryboard extends TrackMediaBase {
  sources: "storyboard";
  index?: number;
}

interface TrackMediaAssets extends TrackMediaBase {
  sources: "assets";
}

interface TrackMediaUnknown extends TrackMediaBase {
  sources?: string;
}

type TrackMedia = TrackMediaStoryboard | TrackMediaAssets | TrackMediaUnknown;

interface HistoryVideoItem {
  errorReason?: string | null;
  src: string;
  id: number;
  duration?: number | string | null;
  projectId?: number | null;
  scriptId?: number | null;
  state?: string | null;
  time?: number | null;
  videoTrackId?: number | null;
}
interface ModelSetting {
  mode: string;
  model: string;
  resolution: string;
  duration: number;
  audio: boolean;
}
