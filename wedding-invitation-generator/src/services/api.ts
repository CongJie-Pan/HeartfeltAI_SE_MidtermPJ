/**
 * API Service Module
 * 
 * This module provides a centralized interface for all API calls in the application.
 * It uses Axios, a promise-based HTTP client, to handle requests and responses.
 * 
 * Key features:
 * - Configured API base URL
 * - Centralized error handling
 * - Organized endpoint grouping by feature area
 * - TypeScript integration with application types
 */
import axios, { AxiosResponse, AxiosError } from 'axios';
import { CoupleInfo, GuestInfo } from '../types';

// Set base URL for all API requests
const API_URL = 'http://localhost:5000/api';

/**
 * Create Axios instance with default configuration
 * This allows for consistent headers and base URL across all requests
 */
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Global response interceptor
 * Handles successful responses and errors in a centralized way
 * Allows for consistent error logging and formatting
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

/**
 * API Service Object
 * 
 * Organized collection of API endpoints grouped by feature area.
 * Each method returns a promise that resolves to the API response.
 */
export const api = {
  /**
   * Health Check Endpoints
   * Used to verify API connection and status
   */
  health: {
    // Basic health check for quick status verification
    check: () => apiClient.get('/health'),
    // Detailed health check with system information
    detailed: () => apiClient.get('/health/detailed'),
    // Email service health check
    email: () => apiClient.get('/health/email')
  },
  
  /**
   * Couple Information Endpoints
   * Manage wedding couple data
   */
  couple: {
    // Create or update couple information
    save: (coupleData: CoupleInfo) => apiClient.post('/couple', coupleData),
    // Retrieve current couple information
    get: () => apiClient.get('/couple'),
  },
  
  /**
   * Guest Management Endpoints
   * Manage guest list and individual guest data
   */
  guests: {
    // Add a new guest to the system
    add: (guestData: GuestInfo) => apiClient.post('/guests', guestData),
    // Get all guests, optionally filtered by couple ID
    getAll: () => apiClient.get('/guests'),
    // Get a specific guest by ID
    get: (id: string) => apiClient.get(`/guests/${id}`),
    // Update an existing guest's information
    update: (id: string, guestData: GuestInfo) => apiClient.put(`/guests/${id}`, guestData),
    // Remove a guest from the system
    delete: (id: string) => apiClient.delete(`/guests/${id}`),
  },
  
  /**
   * Invitation Generation Endpoints
   * Generate and manage personalized invitation content
   */
  invitations: {
    // Generate a personalized invitation for a guest
    // The 'force' parameter can be used to regenerate even if one exists
    generate: (guestId: string, force = false) => 
      apiClient.post('/invitations/generate', { guestId }, { params: { force } }),
    // Update the content of an existing invitation
    // Optional feedbackText can be provided to guide AI regeneration
    update: (guestId: string, invitationContent: string, feedbackText?: string) => 
      apiClient.put(`/invitations/${guestId}`, { invitationContent, feedbackText }),
  },
  
  /**
   * Email Delivery Endpoints
   * Send invitations to guests via email
   */
  emails: {
    // Send all pending invitations at once
    // Requires coupleInfoId to identify which couple's guests to send invitations to
    sendAll: (coupleInfoId: string) => apiClient.post('/emails/send', { coupleInfoId }),
    // Send invitation to a specific guest
    send: (guestId: string) => apiClient.post(`/emails/send/${guestId}`),
  },
};

export default api; 