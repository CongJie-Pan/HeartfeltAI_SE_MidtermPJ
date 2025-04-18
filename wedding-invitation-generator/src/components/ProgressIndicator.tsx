import React from 'react';
import { Step } from '../types';
import { useWedding } from '../context/WeddingContext';

// 步驟標題對應表
const stepTitles: Record<Step, string> = {
  [Step.Welcome]: '歡迎',
  [Step.CoupleInfo]: '新人資料',
  [Step.GuestInfo]: '賓客資料',
  [Step.Preview]: '邀請函預覽',
  [Step.Confirmation]: '最終確認',
  [Step.Complete]: '完成'
};

// 進度指示器組件
// 該組件顯示流程中的所有步驟，並標記當前步驟，幫助用戶了解當前位於流程的哪個階段
const ProgressIndicator: React.FC = () => {
  const { state } = useWedding();
  const { currentStep } = state;
  
  // 計算總步驟數（不包括歡迎頁和完成頁）
  const totalSteps = Object.keys(Step).length / 2 - 2; // 除以2是因為枚舉同時有數字和字符串索引
  
  return (
    <div className="mb-8 w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        {/* 繪製進度條節點和連接線 */}
        {Array.from({ length: totalSteps }).map((_, index) => {
          // 對應到實際步驟（從CoupleInfo開始）
          const stepIndex = index + 1;
          const isActive = currentStep >= stepIndex;
          const isCurrentStep = currentStep === stepIndex;
          
          return (
            <React.Fragment key={stepIndex}>
              {/* 節點 */}
              <div className="flex flex-col items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300
                    ${isActive 
                      ? 'bg-wedding-primary text-wedding-dark' 
                      : 'bg-gray-200 text-gray-500'
                    }
                    ${isCurrentStep ? 'ring-4 ring-wedding-accent ring-opacity-50' : ''}
                  `}
                >
                  {stepIndex}
                </div>
                <div className={`mt-2 text-xs font-medium transition-colors duration-300 ${isActive ? 'text-wedding-dark' : 'text-gray-400'}`}>
                  {stepTitles[stepIndex as Step]}
                </div>
              </div>
              
              {/* 連接線（最後一個節點後沒有連接線） */}
              {index < totalSteps - 1 && (
                <div 
                  className={`flex-1 h-0.5 mx-1 transition-colors duration-300 
                    ${currentStep > stepIndex ? 'bg-wedding-primary' : 'bg-gray-200'}`
                  }
                ></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressIndicator; 