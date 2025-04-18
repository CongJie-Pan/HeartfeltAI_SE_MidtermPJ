import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { WeddingProvider } from './context/WeddingContext';
import { Step } from './types';

// 頁面組件
import WelcomePage from './pages/WelcomePage';
import CoupleInfoPage from './pages/CoupleInfoPage';
import GuestInfoPage from './pages/GuestInfoPage';
import PreviewPage from './pages/PreviewPage';
import ConfirmationPage from './pages/ConfirmationPage';
import CompletePage from './pages/CompletePage';

// 根據步驟獲取對應頁面
const getPageByStep = (step: Step) => {
  switch (step) {
    case Step.Welcome:
      return <WelcomePage />;
    case Step.CoupleInfo:
      return <CoupleInfoPage />;
    case Step.GuestInfo:
      return <GuestInfoPage />;
    case Step.Preview:
      return <PreviewPage />;
    case Step.Confirmation:
      return <ConfirmationPage />;
    case Step.Complete:
      return <CompletePage />;
    default:
      return <WelcomePage />;
  }
};

// 主應用組件
// 設置路由和全局上下文，提供整個應用的骨架結構
const App: React.FC = () => {
  return (
    <WeddingProvider>
      <div className="app min-h-screen bg-wedding-secondary font-sans">
        <Routes>
          <Route path="/" element={<StepManager />} />
        </Routes>
      </div>
    </WeddingProvider>
  );
};

// 步驟管理器組件
// 負責根據當前的步驟顯示對應的頁面組件
const StepManager: React.FC = () => {
  const { state } = useWedding();
  
  return (
    <AnimatePresence mode="wait">
      {getPageByStep(state.currentStep)}
    </AnimatePresence>
  );
};

// 引入useWedding hook
import { useWedding } from './context/WeddingContext';

export default App;
