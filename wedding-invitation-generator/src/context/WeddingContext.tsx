import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { WeddingAppState, Step, CoupleInfo, GuestInfo } from '../types';

// 定義初始狀態
const initialState: WeddingAppState = {
  currentStep: Step.Welcome,
  coupleInfo: {
    groomName: '',
    brideName: '',
    weddingDate: null,
    weddingTime: '',
    weddingLocation: '',
    weddingTheme: '',
    backgroundStory: ''
  },
  guests: [],
  loading: false,
  error: null
};

// 定義可能的操作類型
type ActionType = 
  | { type: 'SET_STEP'; payload: Step }
  | { type: 'SET_COUPLE_INFO'; payload: CoupleInfo }
  | { type: 'ADD_GUEST'; payload: GuestInfo }
  | { type: 'UPDATE_GUEST'; payload: GuestInfo }
  | { type: 'REMOVE_GUEST'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_INVITATION'; payload: { guestId: string; content: string; status: 'generated' | 'edited' | 'sent' } };

// 建立狀態管理的Reducer
const weddingReducer = (state: WeddingAppState, action: ActionType): WeddingAppState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_COUPLE_INFO':
      return { ...state, coupleInfo: action.payload };
    case 'ADD_GUEST':
      return { 
        ...state, 
        guests: [...state.guests, action.payload] 
      };
    case 'UPDATE_GUEST':
      return { 
        ...state, 
        guests: state.guests.map(guest => 
          guest.id === action.payload.id ? action.payload : guest
        )
      };
    case 'REMOVE_GUEST':
      return { 
        ...state, 
        guests: state.guests.filter(guest => guest.id !== action.payload) 
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'UPDATE_INVITATION':
      return {
        ...state,
        guests: state.guests.map(guest => 
          guest.id === action.payload.guestId 
            ? { 
                ...guest, 
                invitationContent: action.payload.content,
                status: action.payload.status 
              } 
            : guest
        )
      };
    default:
      return state;
  }
};

// 創建上下文
interface WeddingContextType {
  state: WeddingAppState;
  dispatch: React.Dispatch<ActionType>;
  nextStep: () => void;
  prevStep: () => void;
}

const WeddingContext = createContext<WeddingContextType | undefined>(undefined);

// 建立上下文提供者組件
interface WeddingProviderProps {
  children: ReactNode;
}

export const WeddingProvider: React.FC<WeddingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(weddingReducer, initialState);

  // 方便的導航方法
  const nextStep = () => {
    if (state.currentStep < Step.Complete) {
      dispatch({ 
        type: 'SET_STEP', 
        payload: state.currentStep + 1 as Step 
      });
    }
  };

  const prevStep = () => {
    if (state.currentStep > Step.Welcome) {
      dispatch({ 
        type: 'SET_STEP', 
        payload: state.currentStep - 1 as Step 
      });
    }
  };

  return (
    <WeddingContext.Provider value={{ state, dispatch, nextStep, prevStep }}>
      {children}
    </WeddingContext.Provider>
  );
};

// 創建自定義Hook以便輕鬆使用上下文
export const useWedding = (): WeddingContextType => {
  const context = useContext(WeddingContext);
  if (context === undefined) {
    throw new Error('useWedding must be used within a WeddingProvider');
  }
  return context;
}; 