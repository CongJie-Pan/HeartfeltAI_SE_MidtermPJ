/**
 * Wedding Context Module
 * 
 * This module implements a centralized state management system using React Context API
 * for the wedding invitation generator application. It manages the entire application 
 * state including current step, couple information, guest data, and UI state.
 * 
 * The implementation uses React's useReducer hook for predictable state updates
 * and provides helper methods for common operations.
 */
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { WeddingAppState, Step, CoupleInfo, GuestInfo } from '../types';

/**
 * Initial application state
 * Defines the default values for all state properties
 */
const initialState: WeddingAppState = {
  currentStep: Step.Welcome,     // Start at welcome screen
  coupleInfo: {
    groomName: '',
    brideName: '',
    weddingDate: null,
    weddingTime: '',
    weddingLocation: '',
    weddingTheme: '',
    backgroundStory: ''
  },
  guests: [],                   // Empty guests array
  loading: false,               // No loading state initially
  error: null                   // No errors initially
};

/**
 * Action types for the reducer
 * Defines all possible actions that can modify the application state
 * Each action has a specific type and payload structure
 */
type ActionType = 
  | { type: 'SET_STEP'; payload: Step }                // Change current step
  | { type: 'SET_COUPLE_INFO'; payload: CoupleInfo }   // Update couple information
  | { type: 'ADD_GUEST'; payload: GuestInfo }          // Add a new guest
  | { type: 'UPDATE_GUEST'; payload: GuestInfo }       // Update existing guest
  | { type: 'REMOVE_GUEST'; payload: string }          // Remove guest by ID
  | { type: 'SET_LOADING'; payload: boolean }          // Set loading state
  | { type: 'SET_ERROR'; payload: string | null }      // Set error message
  | { type: 'UPDATE_INVITATION'; payload: { guestId: string; content: string; status: 'generated' | 'edited' | 'sent' } }; // Update invitation content

/**
 * Reducer function for wedding application state
 * Handles all state transitions in response to dispatched actions
 * 
 * @param {WeddingAppState} state - Current application state
 * @param {ActionType} action - Action to process
 * @returns {WeddingAppState} New application state
 */
const weddingReducer = (state: WeddingAppState, action: ActionType): WeddingAppState => {
  let guestExists; // declare the variable before using it
  
  switch (action.type) {
    case 'SET_STEP':
      // Update the current step
      return { ...state, currentStep: action.payload };
      
    case 'SET_COUPLE_INFO':
      // Update couple information
      return { ...state, coupleInfo: action.payload };
      
    case 'ADD_GUEST':
      // check if the guest already exists (based on ID)
      guestExists = state.guests.some(guest => guest.id === action.payload.id);
      
      // if the guest already exists, skip the addition and return the current state
      if (guestExists) {
        console.log(`Guest with ID ${action.payload.id} already exists, skipping addition.`);
        return state;
      }
      
      // otherwise, add the new guest to the array
      return { 
        ...state, 
        guests: [...state.guests, action.payload] 
      };
      
    case 'UPDATE_GUEST':
      // Update an existing guest by ID
      return { 
        ...state, 
        guests: state.guests.map(guest => 
          guest.id === action.payload.id ? action.payload : guest
        )
      };
      
    case 'REMOVE_GUEST':
      // Remove a guest by ID
      return { 
        ...state, 
        guests: state.guests.filter(guest => guest.id !== action.payload) 
      };
      
    case 'SET_LOADING':
      // Update loading state
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      // Update error state
      return { ...state, error: action.payload };
      
    case 'UPDATE_INVITATION':
      // Update invitation content and status for a specific guest
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
      // Unknown action type, return current state
      return state;
  }
};

/**
 * Wedding Context Type Definition
 * Defines the shape of the context that will be provided to consumers
 */
interface WeddingContextType {
  state: WeddingAppState;                // Current application state
  dispatch: React.Dispatch<ActionType>;  // Function to dispatch actions
  nextStep: () => void;                  // Helper to move to next step
  prevStep: () => void;                  // Helper to move to previous step
}

/**
 * Create the context with undefined default value
 * The actual value will be provided by the WeddingProvider component
 */
const WeddingContext = createContext<WeddingContextType | undefined>(undefined);

/**
 * Wedding Provider Props Interface
 * Defines the expected props for the provider component
 */
interface WeddingProviderProps {
  children: ReactNode;  // Child components that will have access to the context
}

/**
 * Wedding Provider Component
 * Provides the wedding context to all child components
 * 
 * @param {WeddingProviderProps} props - Component props
 * @returns {JSX.Element} Provider component with context value
 */
export const WeddingProvider: React.FC<WeddingProviderProps> = ({ children }) => {
  // Initialize the reducer with initial state
  const [state, dispatch] = useReducer(weddingReducer, initialState);

  /**
   * Navigate to the next step in the workflow
   * Only advances if not already at the final step
   */
  const nextStep = () => {
    if (state.currentStep < Step.Complete) {
      dispatch({ 
        type: 'SET_STEP', 
        payload: state.currentStep + 1 as Step 
      });
    }
  };

  /**
   * Navigate to the previous step in the workflow
   * Only goes back if not already at the first step
   */
  const prevStep = () => {
    if (state.currentStep > Step.Welcome) {
      dispatch({ 
        type: 'SET_STEP', 
        payload: state.currentStep - 1 as Step 
      });
    }
  };

  // Create the context value object with state and functions
  return (
    <WeddingContext.Provider value={{ state, dispatch, nextStep, prevStep }}>
      {children}
    </WeddingContext.Provider>
  );
};

/**
 * Custom hook to use the wedding context
 * Provides a convenient way to access the context in any component
 * 
 * @returns {WeddingContextType} The wedding context value
 * @throws {Error} If used outside of a WeddingProvider
 */
export const useWedding = (): WeddingContextType => {
  const context = useContext(WeddingContext);
  if (context === undefined) {
    throw new Error('useWedding must be used within a WeddingProvider');
  }
  return context;
}; 