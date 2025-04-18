/**
 * Main Application Component
 * 
 * This is the root component of the wedding invitation generator application.
 * It sets up the application structure including:
 * - React Router for navigation
 * - Framer Motion for page transitions
 * - WeddingContext for global state management
 * 
 * The application follows a step-based workflow where users progress through
 * different stages of the invitation creation process.
 */
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { WeddingProvider } from './context/WeddingContext';
import { Step } from './types';

// Import page components
import WelcomePage from './pages/WelcomePage';
import CoupleInfoPage from './pages/CoupleInfoPage';
import GuestInfoPage from './pages/GuestInfoPage';
import PreviewPage from './pages/PreviewPage';
import ConfirmationPage from './pages/ConfirmationPage';
import CompletePage from './pages/CompletePage';

/**
 * Maps application steps to their corresponding page components
 * 
 * This function returns the appropriate React component based on the current step
 * in the wedding invitation creation process.
 * 
 * @param {Step} step - Current application step from the enum
 * @returns {JSX.Element} The component corresponding to the current step
 */
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

/**
 * App Component
 * 
 * The main application component that sets up the context provider
 * and routing structure. Although we use React Router, the actual
 * navigation is handled by the WeddingContext state.
 * 
 * @returns {JSX.Element} The complete application structure
 */
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

/**
 * Step Manager Component
 * 
 * This component is responsible for rendering the appropriate page
 * based on the current step in the WeddingContext. It uses Framer Motion's
 * AnimatePresence to handle smooth transitions between pages.
 * 
 * @returns {JSX.Element} The current step's page component
 */
const StepManager: React.FC = () => {
  const { state } = useWedding();
  
  return (
    <AnimatePresence mode="wait">
      {getPageByStep(state.currentStep)}
    </AnimatePresence>
  );
};

// Import the Wedding context hook
import { useWedding } from './context/WeddingContext';

export default App;
