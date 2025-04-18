/**
 * Type Definitions for Wedding Invitation Generator
 * 
 * This file contains all the TypeScript interfaces, types, and enums
 * used throughout the application. Having centralized type definitions
 * ensures type consistency across components and helps with maintenance.
 */

/**
 * CoupleInfo Interface
 * 
 * Defines the structure for storing information about the wedding couple.
 * This data forms the foundation for generating personalized invitations.
 */
export interface CoupleInfo {
  groomName: string;             // Name of the groom
  brideName: string;             // Name of the bride
  weddingDate: Date | null;      // Date of the wedding ceremony
  weddingTime: string;           // Time of the wedding ceremony
  weddingLocation: string;       // Location/venue of the wedding
  weddingTheme: string;          // Theme of the wedding (e.g., "Beach", "Garden")
  backgroundStory: string;       // Story of how the couple met (optional)
}

/**
 * RelationshipType
 * 
 * Defines possible relationships between the couple and their guests.
 * Used for categorizing guests and personalizing their invitations.
 * (All values are in Traditional Chinese)
 */
export type RelationshipType = 
  | '親戚'         // Relative
  | '朋友'         // Friend
  | '同事'         // Colleague
  | '家人'         // Family member
  | '學校同學'     // School classmate
  | '其他';        // Other

/**
 * GuestInfo Interface
 * 
 * Defines the structure for storing information about each guest.
 * This data is used to generate personalized invitations and manage
 * the guest list throughout the invitation process.
 */
export interface GuestInfo {
  id: string;                    // Unique identifier for the guest
  name: string;                  // Guest's full name
  relationship: RelationshipType;// Relationship to the couple
  preferences?: string;          // Guest's preferences (optional)
  howMet?: string;               // How the guest met the couple (optional)
  memories?: string;             // Shared memories with the couple (optional)
  email: string;                 // Email address for sending the invitation
  phone?: string;                // Phone number (optional)
  invitationContent?: string;    // Generated invitation text
  status?: 'pending' | 'generated' | 'edited' | 'sent'; // Current status of invitation
}

/**
 * Step Enum
 * 
 * Defines the different stages in the wedding invitation workflow.
 * Used to track user progress and render the appropriate component.
 */
export enum Step {
  Welcome = 0,      // Initial welcome screen
  CoupleInfo = 1,   // Couple information input
  GuestInfo = 2,    // Guest information input
  Preview = 3,      // Preview generated invitations
  Confirmation = 4, // Final confirmation before sending
  Complete = 5      // Completion/success screen
}

/**
 * WeddingAppState Interface
 * 
 * Defines the global state structure for the application.
 * Used by the WeddingContext to manage application state.
 */
export interface WeddingAppState {
  currentStep: Step;            // Current step in the workflow
  coupleInfo: CoupleInfo;       // Information about the wedding couple
  guests: GuestInfo[];          // List of guests and their information
  loading: boolean;             // Loading state for async operations
  error: string | null;         // Error message if any operation fails
}

/**
 * Petal Interface
 * 
 * Defines the properties for the falling petal animation elements.
 * Used to create decorative background animations.
 */
export interface Petal {
  id: number;               // Unique identifier for the petal
  left: string;             // Horizontal position (CSS value)
  animationDuration: string;// Duration of the falling animation
  animationDelay: string;   // Delay before animation starts
  image: string;            // Path to the petal image
} 