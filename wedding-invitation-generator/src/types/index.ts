// 定義新人資料的類型
export interface CoupleInfo {
  groomName: string;
  brideName: string;
  weddingDate: Date | null;
  weddingTime: string;
  weddingLocation: string;
  weddingTheme: string;
  backgroundStory: string;
}

// 賓客與新人的關係類型
export type RelationshipType = 
  | '親戚' 
  | '朋友' 
  | '同事' 
  | '家人' 
  | '學校同學' 
  | '其他';

// 賓客信息的類型定義
export interface GuestInfo {
  id: string; // 唯一識別碼
  name: string; // 賓客姓名
  relationship: RelationshipType; // 與新人關係
  preferences?: string; // 賓客喜好
  howMet?: string; // 如何認識
  memories?: string; // 共同的回憶
  email: string; // 電子郵件地址
  phone?: string; // 電話號碼
  invitationContent?: string; // 生成的邀請函內容
  status?: 'pending' | 'generated' | 'edited' | 'sent'; // 邀請函狀態
}

// 頁面導航的步驟定義
export enum Step {
  Welcome = 0,
  CoupleInfo = 1,
  GuestInfo = 2,
  Preview = 3,
  Confirmation = 4,
  Complete = 5
}

// 系統全域狀態的類型定義
export interface WeddingAppState {
  currentStep: Step;
  coupleInfo: CoupleInfo;
  guests: GuestInfo[];
  loading: boolean;
  error: string | null;
}

// 設置花瓣動畫元素的類型
export interface Petal {
  id: number;
  left: string;
  animationDuration: string;
  animationDelay: string;
  image: string;
} 