/**
 * Invitation Preview Page
 * 
 * This page allows users to preview and customize the generated invitations
 * for each guest. It represents the third step in the workflow where users
 * can review AI-generated content before sending.
 * 
 * Key features:
 * - AI-powered invitation generation for each guest
 * - Preview functionality with visual representation of invitations
 * - Ability to edit and customize invitation content
 * - Responsive grid layout for multiple guests
 * - Modal interface for detailed preview and editing
 * - Status indicators for each invitation
 */
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressIndicator from '../components/ProgressIndicator';
import { useWedding } from '../context/WeddingContext';
import { GuestInfo } from '../types';
import api from '../services/api';

// Virtual invitation background image for previews
const templateImage = 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=600&auto=format&fit=crop';

/**
 * PreviewPage Component
 * 
 * Displays a grid of guest invitation previews and provides
 * functionality to view, edit, and customize each invitation.
 * 
 * @returns {JSX.Element} The invitation preview page
 */
const PreviewPage: React.FC = () => {
  // Access wedding context for state management and navigation
  const { state, dispatch, nextStep, prevStep } = useWedding();
  
  // Local state for UI management
  const [selectedGuest, setSelectedGuest] = useState<GuestInfo | null>(null);  // Currently selected guest for preview
  const [editMode, setEditMode] = useState(false);                             // Whether edit mode is active
  const [invitationFeedback, setInvitationFeedback] = useState('');            // User feedback for customization
  const [error, setError] = useState<string | null>(null);                     // Error message if any
  const [generatingGuestId, setGeneratingGuestId] = useState<string | null>(null); // Track which specific guest is being generated
  
  /**
   * Generate fallback invitation content
   * 
   * Creates a simple template-based invitation when the API-based
   * generation fails. Uses guest and couple information to personalize.
   * 
   * @param {GuestInfo} guest - The guest to generate content for
   * @returns {string} Generated invitation text
   */
  const generateFallbackInvitation = useCallback((guest: GuestInfo) => {
    console.log('Generating fallback invitation due to API failure for guest:', guest.name);
    return `
      尊敬的 ${guest.name} ${guest.relationship === '親戚' || guest.relationship === '家人' ? '家人' : '先生/女士'}：
      
      ${state.coupleInfo.groomName} 與 ${state.coupleInfo.brideName} 誠摯地邀請您
      參加我們的婚禮。我們的特殊日子訂於 ${new Date(state.coupleInfo.weddingDate!).toLocaleDateString('zh-TW')} ${state.coupleInfo.weddingTime}，
      地點位於 ${state.coupleInfo.weddingLocation}。
      
      ${guest.howMet ? `還記得我們在${guest.howMet}相識的日子嗎？` : ''}
      ${guest.memories ? `我們一起經歷的${guest.memories}的回憶，一直珍藏在心中。` : ''}
      
      希望您能在這個重要的日子與我們一同慶祝，分享我們的幸福時刻。
      
      期待您的蒞臨！
      
      新人：${state.coupleInfo.groomName} & ${state.coupleInfo.brideName}
    `;
  }, [state.coupleInfo]);
  
  /**
   * Generate invitation for a single guest
   * 
   * Calls the API to generate an invitation for the specified guest.
   * Updates both global state and local state after successful generation.
   * Includes additional error handling and state synchronization mechanisms.
   * 
   * @param {GuestInfo} guest - The guest to generate invitation for
   * @returns {Promise<string | null>} The generated invitation content or null if generation fails
   */
  const generateInvitation = async (guest: GuestInfo) => {
    // If this guest is already being processed, avoid duplicate requests
    if (generatingGuestId === guest.id) {
      console.log(`已經在為賓客 ${guest.name} 生成邀請函，避免重複請求`);
      return null;
    }
    
    // Check if the guest might already have content that's out of sync
    const latestData = getLatestGuestData(guest.id);
    if (latestData?.invitationContent && !guest.invitationContent) {
      console.log(`賓客 ${guest.name} 邀請函已存在但狀態不同步，跳過重新生成`, {
        guestId: guest.id,
        contentLength: latestData.invitationContent.length
      });
      
      // Return the existing content without making an API call
      return latestData.invitationContent;
    }
    
    // Set the generating state to show loading UI
    setGeneratingGuestId(guest.id);
    setError(null);
    
    try {
      console.log(`嘗試為賓客 ${guest.name} 生成邀請函`, {
        guestId: guest.id,
        hasExistingContent: !!guest.invitationContent,
        timestamp: new Date().toISOString()
      });
      
      // Call API to generate invitation content
      const response = await api.invitations.generate(guest.id);
      
      // 檢查回應數據結構
      if (!response.data || !response.data.invitation) {
        console.error(`OpenAI API 回應格式不正確，可能與資料庫結構不匹配`, {
          guestId: guest.id,
          guestName: guest.name,
          responseData: JSON.stringify(response.data)
        });
        throw new Error('API response format invalid');
      }
      
      // 記錄成功生成的邀請函內容
      const content = response.data.invitation;
      console.log(`成功從後端獲取 ${guest.name} 的邀請函`, {
        source: response.data.source,
        contentLength: content.length
      });
      
      // Update global state with generated content
      dispatch({
        type: 'UPDATE_INVITATION',
        payload: {
          guestId: guest.id,
          content: content,
          status: 'generated'
        }
      });
      
      return content;
    } catch (err) {
      console.error(`無法為賓客 ${guest.name} 生成邀請函:`, err);
      console.error(`詳細錯誤資訊:`, {
        guestId: guest.id, 
        guestName: guest.name,
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      // Secondary check - even if API call failed, check if data exists in global state
      const stateCheck = getLatestGuestData(guest.id);
      if (stateCheck?.invitationContent) {
        console.log(`雖然API調用失敗但發現賓客 ${guest.name} 已有邀請函內容，使用現有內容`, {
          guestId: guest.id,
          contentLength: stateCheck.invitationContent.length
        });
        return stateCheck.invitationContent;
      }
      
      // Use fallback content generation if API fails and no existing content
      const fallbackContent = generateFallbackInvitation(guest);
      console.log(`使用備用內容為 ${guest.name} 生成邀請函`);
      dispatch({
        type: 'UPDATE_INVITATION',
        payload: {
          guestId: guest.id,
          content: fallbackContent,
          status: 'generated'
        }
      });
      
      return fallbackContent;
    } finally {
      setGeneratingGuestId(null);
    }
  };
  
  /**
   * Get the latest guest data from state
   * 
   * This ensures we always have the most up-to-date guest information
   * when switching between guests.
   * 
   * @param {string} guestId - The ID of the guest to retrieve
   * @returns {GuestInfo | undefined} The latest guest data or undefined if not found
   */
  const getLatestGuestData = (guestId: string) => {
    return state.guests.find(g => g.id === guestId);
  };
  
  /**
   * Handle invitation preview
   * 
   * Opens the preview modal for a specific guest's invitation,
   * generating content if necessary. Always retrieves the latest
   * data to ensure we display the correct generation status.
   * 
   * @param {GuestInfo} guest - The guest whose invitation to preview
   */
  const handlePreviewInvitation = async (guest: GuestInfo) => {
    try {
      // Always get the latest guest data to ensure accurate generation status
      const latestGuestData = getLatestGuestData(guest.id);
      
      if (!latestGuestData) {
        console.error(`找不到賓客資料: ${guest.id}`);
        setError('找不到賓客資料，請重新整理頁面');
        return;
      }
      
      // Clear any previous guest selection and reset edit mode
      setEditMode(false);
      setInvitationFeedback('');
      
      // 記錄賓客切換
      console.log(`切換到賓客: ${latestGuestData.name}`, {
        guestId: latestGuestData.id,
        hasContent: !!latestGuestData.invitationContent,
        status: latestGuestData.status,
        isGenerating: generatingGuestId === latestGuestData.id
      });
      
      // Set selected guest to open preview modal with latest data
      // Using a new object reference to ensure state update triggers re-render
      setSelectedGuest({...latestGuestData});
      
    } catch (error) {
      console.error('Error handling invitation preview:', error);
      console.error(`處理邀請函預覽時發生錯誤`, {
        guestId: guest.id,
        guestName: guest.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      setError('無法顯示邀請函預覽，請稍後再試。');
    }
  };
  
  /**
   * Handle generating invitation from preview modal
   * 
   * Generates invitation content for a guest when the "生成邀請函" button is clicked
   * and ensures the selected guest data is up-to-date after generation.
   * Directly updates the selected guest state to ensure immediate UI refresh.
   */
  const handleGenerateInvitation = async () => {
    if (!selectedGuest) return;
    
    try {
      // Verify the guest doesn't already have content being generated
      if (generatingGuestId === selectedGuest.id) {
        console.log(`已經在為賓客 ${selectedGuest.name} 生成邀請函，避免重複請求`);
        return;
      }
      
      // Check if maybe the guest already has content that we missed
      const freshData = getLatestGuestData(selectedGuest.id);
      if (freshData?.invitationContent && !selectedGuest.invitationContent) {
        console.log(`發現賓客 ${selectedGuest.name} 已有邀請函但本地狀態未更新，進行同步更新`);
        setSelectedGuest({...freshData});
        return;
      }
      
      // Call the generate function with the selected guest
      const content = await generateInvitation(selectedGuest);
      
      if (content) {
        // After generation, always fetch the latest guest data from state to ensure accuracy
        const updatedGuest = getLatestGuestData(selectedGuest.id);
        
        // Log whether we found updated guest data
        console.log(`邀請函生成後獲取賓客數據`, {
          guestId: selectedGuest.id,
          foundUpdatedData: !!updatedGuest,
          contentLength: content.length
        });
        
        // Only update the selected guest if we found updated data
        if (updatedGuest) {
          // Immediately update the selected guest with the latest data
          setSelectedGuest({...updatedGuest});
        } else {
          // Fallback to updating only the content locally if we can't find the guest in state
          console.warn(`無法在狀態中找到賓客 ${selectedGuest.id}，使用本地更新`);
          setSelectedGuest({
            ...selectedGuest,
            invitationContent: content,
            status: 'generated'
          });
        }
      }
    } catch (error) {
      console.error(`生成邀請函時發生錯誤:`, error);
      setError('生成邀請函時發生錯誤，請稍後再試。');
    }
  };
  
  /**
   * Switch to edit mode
   * 
   * Transitions the modal from preview mode to edit mode
   */
  const handleEditMode = () => {
    if (selectedGuest) {
      setInvitationFeedback('');
      setEditMode(true);
    }
  };
  
  /**
   * Save edited invitation content
   * 
   * Processes user feedback to update the invitation content
   * by sending it to the backend for AI regeneration. After updating,
   * ensures the component state reflects the latest guest data.
   */
  const handleSaveInvitationFeedback = async () => {
    if (!selectedGuest || !invitationFeedback.trim()) return;
    
    try {
      // Track which guest is being updated and set generating state
      setGeneratingGuestId(selectedGuest.id);
      setError(null);
      
      console.log(`嘗試使用反饋更新 ${selectedGuest.name} 的邀請函`, {
        guestId: selectedGuest.id,
        feedbackLength: invitationFeedback.length,
        timestamp: new Date().toISOString()
      });
      
      // Call API to update invitation with feedback text
      await api.invitations.update(
        selectedGuest.id, 
        selectedGuest.invitationContent || '', 
        invitationFeedback.trim()
      );
      
      // Fetch the updated invitation after regeneration
      try {
        // Force regeneration to get the latest content
        const response = await api.invitations.generate(selectedGuest.id, true);
        
        // 檢查是否成功獲取更新後的內容
        if (!response.data || !response.data.invitation) {
          console.error(`編輯後獲取更新邀請函失敗：API回應格式不正確`, {
            guestId: selectedGuest.id,
            responseData: JSON.stringify(response.data)
          });
          throw new Error('Failed to get updated invitation after feedback - invalid API response');
        }
        
        const updatedContent = response.data.invitation;
        
        console.log(`成功獲取根據反饋更新的邀請函`, {
          guestId: selectedGuest.id,
          contentLength: updatedContent.length,
          source: response.data.source
        });
        
        // Update state with regenerated content
        dispatch({
          type: 'UPDATE_INVITATION',
          payload: {
            guestId: selectedGuest.id,
            content: updatedContent,
            status: 'edited'
          }
        });
        
        // Get the latest guest data after state update
        const updatedGuest = getLatestGuestData(selectedGuest.id);
        
        // Log whether we found updated guest data
        console.log(`邀請函編輯後獲取賓客數據`, {
          guestId: selectedGuest.id,
          foundUpdatedData: !!updatedGuest,
          contentLength: updatedContent.length
        });
        
        // Update selected guest with new content - use deep copy to ensure state change is detected
        if (updatedGuest) {
          setSelectedGuest({...updatedGuest});
        } else {
          console.warn(`編輯後無法在狀態中找到賓客 ${selectedGuest.id}，使用本地更新`);
          setSelectedGuest({
            ...selectedGuest,
            invitationContent: updatedContent,
            status: 'edited'
          });
        }
        
        // Show success message and exit edit mode
        alert('感謝您的反饋！已根據您的需求更新邀請函文字。');
        setEditMode(false);
      } catch (fetchError) {
        console.error('Error fetching updated invitation:', fetchError);
        console.error(`獲取更新後邀請函失敗`, {
          guestId: selectedGuest.id,
          guestName: selectedGuest.name,
          errorMessage: fetchError instanceof Error ? fetchError.message : String(fetchError),
          errorStack: fetchError instanceof Error ? fetchError.stack : undefined,
          timestamp: new Date().toISOString()
        });
        setError('無法取得更新後的邀請函，請稍後再嘗試。');
      }
    } catch (error) {
      console.error('Error updating invitation text:', error);
      console.error(`更新邀請函文字時發生錯誤`, {
        guestId: selectedGuest.id,
        guestName: selectedGuest.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        feedbackLength: invitationFeedback.length
      });
      setError('無法更新邀請函，請稍後再試。');
    } finally {
      // Clear generating states when done
      setGeneratingGuestId(null);
    }
  };
  
  /**
   * Cancel editing without saving changes
   * Returns to preview mode
   */
  const handleCancelEdit = () => {
    setEditMode(false);
  };
  
  /**
   * Delete a guest from the system
   * 
   * Confirms with the user before proceeding with deletion
   * 
   * @param {string} id - ID of the guest to delete
   */
  const handleDeleteGuest = async (id: string) => {
    if (window.confirm('確定要刪除此賓客的邀請函？')) {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Call API to delete guest
        await api.guests.delete(id);
        
        // Update frontend state
        dispatch({ type: 'REMOVE_GUEST', payload: id });
        
        // Close modal if currently viewing the deleted guest
        if (selectedGuest && selectedGuest.id === id) {
          setSelectedGuest(null);
        }
      } catch (error) {
        console.error('Error deleting guest:', error);
        setError('無法刪除賓客，請稍後再試。');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };
  
  /**
   * Close the preview/edit modal
   * Resets the modal state
   */
  const closeModal = () => {
    setSelectedGuest(null);
    setEditMode(false);
  };
  
  /**
   * Check if users can proceed to the next step
   * All guests must have invitation content generated
   */
  const canProceed = state.guests.length > 0 && state.guests.every(guest => guest.invitationContent);
  
  /**
   * Animation configuration for the page
   * 
   * Defines how the page animates in and out using Framer Motion
   */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.5 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };
  
  /**
   * Animation configuration for invitation cards
   * 
   * Defines how guest cards animate when displayed
   */
  const cardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };
  
  /**
   * Animation configuration for the modal
   * 
   * Defines how the preview modal animates when opened/closed
   */
  const modalVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      y: 50, 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };
  
  /**
   * Animation configuration for the sidebar
   * 
   * Defines how the sidebar animates in the modal
   */
  const sidebarVariants = {
    hidden: { x: 300, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      x: 300, 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };
  
  /**
   * Effect to sync selected guest with any changes in the global state
   * 
   * This ensures that if a guest's invitation content is updated in the global state,
   * and that guest is currently selected, the UI will reflect those changes immediately.
   */
  useEffect(() => {
    if (selectedGuest) {
      const updatedGuest = getLatestGuestData(selectedGuest.id);
      if (updatedGuest && 
          (updatedGuest.invitationContent !== selectedGuest.invitationContent ||
           updatedGuest.status !== selectedGuest.status)) {
        console.log('Syncing selected guest with updated global state data', {
          guestId: selectedGuest.id,
          oldStatus: selectedGuest.status,
          newStatus: updatedGuest.status,
          hasContentBefore: !!selectedGuest.invitationContent,
          hasContentAfter: !!updatedGuest.invitationContent
        });
        setSelectedGuest(updatedGuest);
      }
    }
  }, [state.guests, selectedGuest]);
  
  /**
   * Handle regenerating invitation for a specific guest from the card view
   * 
   * Force regenerates the invitation content for a guest even if they already have content.
   * This is used when a user wants to get a completely new invitation suggestion.
   * 
   * @param {GuestInfo} guest - The guest whose invitation to regenerate
   * @param {React.MouseEvent} e - The click event
   */
  const handleRegenerateInvitation = async (guest: GuestInfo, e: React.MouseEvent) => {
    try {
      // Prevent event from bubbling up to parent elements
      e.stopPropagation();
      
      // Log the regeneration attempt
      console.log(`Attempting to regenerate invitation for guest: ${guest.name}`, {
        guestId: guest.id,
        hasExistingContent: !!guest.invitationContent,
        currentStatus: guest.status,
        timestamp: new Date().toISOString()
      });
      
      // Check if guest is already being processed
      if (generatingGuestId === guest.id) {
        console.log(`Already generating invitation for ${guest.name}, avoided duplicate request`);
        return;
      }
      
      // Set generating state to show loading UI
      setGeneratingGuestId(guest.id);
      setError(null);
      
      // Force regeneration by calling the API with force=true parameter
      const response = await api.invitations.generate(guest.id, true);
      
      // Validate response data
      if (!response.data || !response.data.invitation) {
        console.error(`Invalid API response format when regenerating invitation for ${guest.name}`, {
          guestId: guest.id,
          responseData: JSON.stringify(response.data)
        });
        throw new Error('API response format invalid during regeneration');
      }
      
      // Extract content from response
      const content = response.data.invitation;
      
      // Log successful regeneration
      console.log(`Successfully regenerated invitation for ${guest.name}`, {
        guestId: guest.id,
        contentLength: content.length,
        source: response.data.source
      });
      
      // Update global state with newly generated content
      dispatch({
        type: 'UPDATE_INVITATION',
        payload: {
          guestId: guest.id,
          content: content,
          status: 'generated'
        }
      });
      
    } catch (error) {
      // Log error details
      console.error(`Failed to regenerate invitation for ${guest.name}:`, error);
      console.error(`Detailed error information:`, {
        guestId: guest.id,
        guestName: guest.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      // Show error message to user
      setError(`無法重新生成 ${guest.name} 的邀請函，請稍後再試。`);
      
    } finally {
      // Clear generating state when done
      setGeneratingGuestId(null);
    }
  };
  
  return (
    <motion.div
      className="min-h-screen py-12 px-4 max-w-6xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <h1 className="text-3xl font-serif text-center font-bold mb-8 text-wedding-dark">電子邀請函預覽</h1>
      
      {/* Progress indicator showing current step */}
      <ProgressIndicator />
      
      {/* Error message display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Guest invitations grid */}
      <div className="mt-8">
        <h2 className="text-xl font-medium mb-4 text-wedding-dark">賓客邀請函預覽</h2>
        <p className="text-sm text-gray-500 mb-6">點擊查看邀請函預覽，可在右側修改個性化文字內容</p>
        
        {/* Responsive grid of invitation cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.guests.map((guest) => (
            <motion.div 
              key={guest.id} 
              className="card cursor-pointer relative hover:shadow-lg"
              variants={cardVariants}
              onClick={() => handlePreviewInvitation(guest)}
              whileHover={{ y: -5 }}
            >
              {/* Delete button */}
              <button
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGuest(guest.id);
                }}
              >
                &times;
              </button>
              
              {/* Guest details header */}
              <h3 className="font-medium text-lg mb-2">{guest.name}</h3>
              <p className="text-xs text-gray-500 mb-4">{guest.relationship} | {guest.email}</p>
              
              {/* Invitation preview card */}
              <div className="h-48 mb-3 overflow-hidden rounded-lg shadow-sm flex items-center justify-center bg-wedding-secondary">
                {generatingGuestId === guest.id ? (
                  /* Loading spinner during generation or regeneration */
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wedding-dark"></div>
                    <p className="text-xs text-wedding-dark">正在生成邀請函...</p>
                    {guest.invitationContent && (
                      <p className="text-xs text-gray-500 italic mt-1">重新生成更好的內容</p>
                    )}
                  </div>
                ) : guest.invitationContent ? (
                  /* Show invitation preview if content exists and not regenerating */
                  <div className="w-full h-full relative">
                    <img 
                      src={templateImage} 
                      alt="邀請函背景" 
                      className="w-full h-full object-cover absolute inset-0 opacity-20" 
                      style={{ backgroundColor: '#ffe1e6' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <p className="text-xs text-center text-black font-medium line-clamp-6 relative z-10">
                        {guest.invitationContent.substring(0, 120)}...
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Generation prompt if no content and not currently generating */
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <svg className="w-10 h-10 text-wedding-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <p className="text-xs text-wedding-dark">點擊生成邀請函</p>
                  </div>
                )}
              </div>
              
              {/* Status indicator and action buttons */}
              <div className="flex justify-between items-center">
                {/* Status badge with conditional styling */}
                <span className={`text-xs px-2 py-1 rounded ${
                  guest.status === 'generated' ? 'bg-blue-100 text-blue-800' : 
                  guest.status === 'edited' ? 'bg-purple-100 text-purple-800' :
                  guest.status === 'sent' ? 'bg-green-100 text-green-800' : 
                  'bg-gray-100 text-gray-800'
                }`}>
                  {guest.status === 'generated' ? '已生成' : 
                   guest.status === 'edited' ? '已編輯' : 
                   guest.status === 'sent' ? '已發送' : '未生成'}
                </span>
                
                {/* Action buttons container */}
                <div className="flex space-x-2">
                  {/* Regenerate button - only show if invitation content exists */}
                  {guest.invitationContent && (
                    <button 
                      className="text-xs text-amber-600 hover:underline disabled:opacity-50 disabled:hover:no-underline"
                      onClick={(e) => handleRegenerateInvitation(guest, e)}
                      disabled={generatingGuestId === guest.id}
                      title="重新生成邀請函內容"
                    >
                      重新生成
                    </button>
                  )}
                  
                  {/* View invitation button */}
                  <button 
                    className="text-xs text-wedding-accent hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewInvitation(guest);
                    }}
                  >
                    查看邀請函
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-12">
        {/* Back button */}
        <button
          onClick={prevStep}
          className="px-6 py-2 border border-wedding-dark text-wedding-dark rounded-lg hover:bg-wedding-dark hover:text-white transition-colors"
        >
          上一步
        </button>
        {/* Next button (disabled if not all invitations are generated) */}
        <button
          onClick={nextStep}
          className={`btn-primary ${!canProceed ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!canProceed}
        >
          確認邀請函，下一步
        </button>
      </div>
      
      {/* Preview/edit modal with guest-specific state awareness */}
      <AnimatePresence>
        {selectedGuest && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="bg-white w-full max-w-4xl rounded-xl shadow-xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
              {/* Invitation preview area with scrollable content */}
              <div className="md:w-3/5 p-6 bg-wedding-secondary relative h-[60vh] md:h-[90vh] overflow-hidden flex flex-col">
                <h3 className="text-xl font-medium mb-4 text-wedding-dark">給 {selectedGuest.name} 的邀請函</h3>
                
                {/* Content container with overflow scroll */}
                <div className="flex-grow overflow-y-auto">
                  {/* Check if this specific guest is currently being generated */}
                  {generatingGuestId === selectedGuest.id ? (
                    /* Loading state during generation or update */
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wedding-dark"></div>
                      <p className="text-wedding-dark">正在處理邀請函，請稍候...</p>
                    </div>
                  ) : !selectedGuest.invitationContent ? (
                    /* 顯示生成按鈕 */
                    <div className="bg-white rounded-lg p-6 shadow-inner flex flex-col items-center justify-center h-[400px]">
                      <svg className="w-16 h-16 text-wedding-accent mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      <p className="text-wedding-dark mb-6">尚未為此賓客生成邀請函</p>
                      <button 
                        className="px-4 py-2 bg-wedding-accent text-white rounded-lg hover:bg-wedding-accent-dark transition-colors"
                        onClick={handleGenerateInvitation}
                        disabled={generatingGuestId === selectedGuest.id}
                      >
                        點擊生成邀請函
                      </button>
                    </div>
                  ) : (
                    /* Invitation content display with scrollable content */
                    <div className="bg-[#ffe1e6] rounded-lg p-6 shadow-inner relative min-h-[400px] max-h-[65vh] overflow-y-auto">
                      <img 
                        src={templateImage} 
                        alt="邀請函背景" 
                        className="absolute inset-0 w-full h-full object-cover opacity-10 rounded-lg" 
                        style={{ backgroundColor: '#ffe1e6' }}
                      />
                      <div className="relative z-10">
                        <pre className="font-serif text-black whitespace-pre-wrap text-black font-medium">
                          {selectedGuest.invitationContent}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Sidebar area (Guest information or Edit interface) */}
              <AnimatePresence mode="wait">
                {editMode ? (
                  /* Edit mode sidebar with scrollable content */
                  <motion.div 
                    className="md:w-2/5 p-6 bg-white h-[60vh] md:h-[90vh] overflow-y-auto"
                    variants={sidebarVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    key="edit"
                  >
                    <h3 className="text-xl font-medium mb-4 text-wedding-dark">編輯邀請函</h3>
                    <p className="text-sm text-gray-500 mb-4">提供修改意見，AI會重新生成邀請函</p>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">修改意見</label>
                      <textarea 
                        className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-accent"
                        placeholder="請描述您想要如何修改邀請函內容，例如：'更加正式一些'、'添加有關我們旅行的回憶'、'請強調誠摯的邀請'等。"
                        value={invitationFeedback}
                        onChange={(e) => setInvitationFeedback(e.target.value)}
                      ></textarea>
                    </div>
                    
                    <div className="flex justify-between mt-6">
                      <button
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                        onClick={handleCancelEdit}
                      >
                        取消
                      </button>
                      <button
                        className="px-4 py-2 bg-wedding-accent text-white rounded-lg hover:bg-wedding-accent-dark transition-colors"
                        onClick={handleSaveInvitationFeedback}
                        disabled={generatingGuestId === selectedGuest.id || !invitationFeedback.trim()}
                      >
                        保存修改
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* Info mode sidebar (guest details) with scrollable content */
                  <motion.div 
                    className="md:w-2/5 p-6 flex flex-col justify-between h-[60vh] md:h-[90vh] overflow-y-auto"
                    variants={sidebarVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    key="info"
                  >
                    <div>
                      <h3 className="text-xl font-medium mb-4 text-wedding-dark">賓客信息</h3>
                      
                      <div className="space-y-4 overflow-y-auto max-h-[50vh]">
                        <div>
                          <h4 className="font-medium text-wedding-dark mb-1">關係</h4>
                          <p className="text-gray-600">{selectedGuest.relationship || '未指定'}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-wedding-dark mb-1">相識經過</h4>
                          <p className="text-gray-600">{selectedGuest.howMet || '未指定'}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-wedding-dark mb-1">共同回憶</h4>
                          <p className="text-gray-600">{selectedGuest.memories || '未指定'}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-wedding-dark mb-1">特殊喜好/興趣</h4>
                          <p className="text-gray-600">{selectedGuest.preferences || '未指定'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-4">
                      <button
                        className="w-full px-4 py-2 bg-wedding-accent text-white rounded-lg hover:bg-wedding-accent-dark transition-colors flex items-center justify-center"
                        onClick={handleEditMode}
                        disabled={!selectedGuest.invitationContent}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        編輯邀請函
                      </button>
                      
                      <button
                        className="w-full px-4 py-2 border border-wedding-accent text-wedding-accent rounded-lg hover:bg-wedding-secondary transition-colors"
                        onClick={closeModal}
                      >
                        關閉預覽
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PreviewPage; 