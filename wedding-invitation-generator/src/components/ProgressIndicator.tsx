/**
 * Progress Indicator Component
 * 
 * This component displays a visual progress indicator for multi-step flows.
 * It shows all steps in the process with the current step highlighted,
 * helping users understand where they are in the overall flow.
 * 
 * The component integrates with the WeddingContext to retrieve the current step
 * and dynamically updates as the user progresses through the application.
 */
import React from 'react';
import { Step } from '../types';
import { useWedding } from '../context/WeddingContext';

/**
 * Step title mapping
 * Maps enum values to human-readable step titles in Traditional Chinese
 * Used to display descriptive labels under each step indicator
 */
const stepTitles: Record<Step, string> = {
  [Step.Welcome]: '歡迎',
  [Step.CoupleInfo]: '新人資料',
  [Step.GuestInfo]: '賓客資料',
  [Step.Preview]: '邀請函預覽',
  [Step.Confirmation]: '最終確認',
  [Step.Complete]: '完成'
};

/**
 * ProgressIndicator Component
 * 
 * Displays a horizontal progress bar with numbered steps, highlighting
 * the current step and showing completed steps with different styling.
 * 
 * @returns {JSX.Element} A progress indicator component with numbered steps and labels
 */
const ProgressIndicator: React.FC = () => {
  // Get current step from the wedding context
  const { state } = useWedding();
  const { currentStep } = state;
  
  /**
   * Calculate the total number of displayable steps
   * Excludes the Welcome and Complete steps as they are entry/exit points,
   * not part of the main workflow that needs indicator representation
   */
  const totalSteps = Object.keys(Step).length / 2 - 2; // Divide by 2 because enums create both numeric and string keys
  
  return (
    <div className="mb-8 w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        {/* Generate step nodes and connecting lines */}
        {Array.from({ length: totalSteps }).map((_, index) => {
          // Map array index to actual step value (starting from CoupleInfo = 1)
          const stepIndex = index + 1;
          
          // Determine if this step is active (current or completed)
          const isActive = currentStep >= stepIndex;
          
          // Determine if this is the current step (for special highlighting)
          const isCurrentStep = currentStep === stepIndex;
          
          return (
            <React.Fragment key={stepIndex}>
              {/* Step node (circle with number) */}
              <div className="flex flex-col items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300
                    ${isActive 
                      ? 'bg-wedding-primary text-wedding-dark' // Active step styling
                      : 'bg-gray-200 text-gray-500'            // Inactive step styling
                    }
                    ${isCurrentStep ? 'ring-4 ring-wedding-accent ring-opacity-50' : ''} // Additional highlight for current step
                  `}
                >
                  {stepIndex} {/* Step number */}
                </div>
                <div className={`mt-2 text-xs font-medium transition-colors duration-300 ${isActive ? 'text-wedding-dark' : 'text-gray-400'}`}>
                  {stepTitles[stepIndex as Step]} {/* Step title */}
                </div>
              </div>
              
              {/* Connecting line between steps (omitted after the last step) */}
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