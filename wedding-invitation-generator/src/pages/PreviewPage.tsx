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
import React, { useState, useEffect } from 'react';
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
  const [isGenerating, setIsGenerating] = useState(false);                     // Loading state for generation
  const [error, setError] = useState<string | null>(null);                     // Error message if any
  
  /**
   * Generate invitations for all guests on page load
   * 
   * This effect runs when the page loads and ensures all guests
   * have invitation content generated for them.
   */
  useEffect(() => {
    const generateAllInvitations = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Generate invitations for guests that don't have one yet
        for (const guest of state.guests) {
          if (!guest.invitationContent) {
            try {
              // Call API to generate invitation content
              const response = await api.invitations.generate(guest.id);
              
              // Update state with generated content
              dispatch({
                type: 'UPDATE_INVITATION',
                payload: {
                  guestId: guest.id,
                  content: response.data.invitationContent,
                  status: 'generated'
                }
              });
            } catch (err) {
              console.error(`Unable to generate invitation for guest ${guest.name}:`, err);
              
              // Use fallback content generation if API fails
              const fallbackContent = generateFallbackInvitation(guest);
              dispatch({
                type: 'UPDATE_INVITATION',
                payload: {
                  guestId: guest.id,
                  content: fallbackContent,
                  status: 'generated'
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('Error generating invitations:', error);
        setError('無法生成部分邀請函，請稍後再試。');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    if (state.guests.length > 0) {
      generateAllInvitations();
    }
  }, [state.guests, dispatch]);
  
  /**
   * Generate fallback invitation content
   * 
   * Creates a simple template-based invitation when the API-based
   * generation fails. Uses guest and couple information to personalize.
   * 
   * @param {GuestInfo} guest - The guest to generate content for
   * @returns {string} Generated invitation text
   */
  const generateFallbackInvitation = (guest: GuestInfo) => {
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
  };
  
  /**
   * Handle invitation preview
   * 
   * Opens the preview modal for a specific guest's invitation,
   * generating content if necessary.
   * 
   * @param {GuestInfo} guest - The guest whose invitation to preview
   */
  const handlePreviewInvitation = async (guest: GuestInfo) => {
    try {
      // Generate invitation content if not already available
      if (!guest.invitationContent) {
        setIsGenerating(true);
        setError(null);
        
        try {
          // Call API to generate invitation
          const response = await api.invitations.generate(guest.id);
          
          // Update state with generated content
          dispatch({
            type: 'UPDATE_INVITATION',
            payload: {
              guestId: guest.id,
              content: response.data.invitationContent,
              status: 'generated'
            }
          });
          
          // Update the guest object with new content
          guest = {
            ...guest,
            invitationContent: response.data.invitationContent,
            status: 'generated'
          };
        } catch (err) {
          console.error('Error generating invitation:', err);
          
          // Use fallback content if API fails
          const fallbackContent = generateFallbackInvitation(guest);
          dispatch({
            type: 'UPDATE_INVITATION',
            payload: {
              guestId: guest.id,
              content: fallbackContent,
              status: 'generated'
            }
          });
          
          // Update the guest object with fallback content
          guest = {
            ...guest,
            invitationContent: fallbackContent,
            status: 'generated'
          };
        }
      }
      
      // Set selected guest to open preview modal
      setSelectedGuest(guest);
      setEditMode(false);
    } catch (error) {
      console.error('Error handling invitation preview:', error);
      setError('無法顯示邀請函預覽，請稍後再試。');
    } finally {
      setIsGenerating(false);
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
   * by sending it to the backend for AI regeneration
   */
  const handleSaveInvitationFeedback = async () => {
    if (selectedGuest && invitationFeedback.trim()) {
      try {
        setIsGenerating(true);
        setError(null);
        
        // Call API to update invitation with feedback text
        await api.invitations.update(selectedGuest.id, selectedGuest.invitationContent || '', invitationFeedback || '');        
        // Fetch the updated invitation after regeneration
        try {
          const response = await api.invitations.generate(selectedGuest.id, true);
          
          // Update state with regenerated content
          dispatch({
            type: 'UPDATE_INVITATION',
            payload: {
              guestId: selectedGuest.id,
              content: response.data.invitationContent,
              status: 'edited'
            }
          });
          
          // Update selected guest with new content
          setSelectedGuest({
            ...selectedGuest,
            invitationContent: response.data.invitationContent,
            status: 'edited'
          });
        } catch (fetchError) {
          console.error('Error fetching updated invitation:', fetchError);
          setError('無法取得更新後的邀請函，請稍後再嘗試。');
        }
        
        // Show success message and exit edit mode
        alert('感謝您的反饋！已根據您的需求更新邀請函文字。');
        setEditMode(false);
      } catch (error) {
        console.error('Error updating invitation text:', error);
        setError('無法更新邀請函，請稍後再試。');
      } finally {
        setIsGenerating(false);
      }
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
                {guest.invitationContent ? (
                  /* Show invitation preview if content exists */
                  <div className="w-full h-full relative">
                    <img 
                      src={templateImage} 
                      alt="邀請函背景" 
                      className="w-full h-full object-cover absolute inset-0 opacity-40" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <p className="text-xs text-center text-wedding-dark line-clamp-6 relative z-10">
                        {guest.invitationContent.substring(0, 120)}...
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Show loading or generation prompt if no content */
                  <div className="flex flex-col items-center justify-center space-y-2">
                    {isGenerating ? (
                      /* Loading spinner during generation */
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wedding-dark"></div>
                        <p className="text-xs text-wedding-dark">正在生成邀請函...</p>
                      </>
                    ) : (
                      /* Generation prompt */
                      <>
                        <svg className="w-10 h-10 text-wedding-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                        <p className="text-xs text-wedding-dark">點擊生成邀請函</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {/* Status indicator and action button */}
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
      
      {/* Preview/edit modal */}
      <AnimatePresence>
        {selectedGuest && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="bg-white w-full max-w-4xl rounded-xl shadow-xl overflow-hidden flex flex-col md:flex-row"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
              {/* Invitation preview area */}
              <div className="md:w-3/5 p-6 bg-wedding-secondary relative">
                <h3 className="text-xl font-medium mb-4 text-wedding-dark">給 {selectedGuest.name} 的邀請函</h3>
                
                {isGenerating ? (
                  /* Loading state during generation or update */
                  <div className="h-full flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wedding-dark"></div>
                    <p className="text-wedding-dark">正在處理邀請函，請稍候...</p>
                  </div>
                ) : (
                  /* Invitation content display */
                  <div className="bg-white rounded-lg p-6 shadow-inner relative min-h-[400px]">
                    <img 
                      src={templateImage} 
                      alt="邀請函背景" 
                      className="absolute inset-0 w-full h-full object-cover opacity-30 rounded-lg" 
                    />
                    <div className="relative z-10">
                      <pre className="font-serif text-wedding-dark whitespace-pre-wrap">
                        {selectedGuest.invitationContent}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Sidebar area - switches between edit mode and info mode */}
              <AnimatePresence mode="wait">
                {editMode ? (
                  /* Edit mode sidebar */
                  <motion.div 
                    className="md:w-2/5 p-6 bg-white"
                    variants={sidebarVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    key="edit"
                  >
                    <h3 className="text-xl font-medium mb-4 text-wedding-dark">編輯邀請函</h3>
                    <p className="text-sm text-gray-500 mb-4">請提供您希望修改的內容或特別要求</p>
                    
                    {/* Feedback textarea for customization */}
                    <textarea 
                      className="w-full h-48 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-wedding-accent"
                      placeholder="例如：希望增加更多關於我們共同回憶的內容，或者調整稱呼方式..."
                      value={invitationFeedback}
                      onChange={(e) => setInvitationFeedback(e.target.value)}
                    ></textarea>
                    
                    {/* Action buttons */}
                    <div className="flex space-x-4 mt-4">
                      <button 
                        className="btn-primary py-2"
                        onClick={handleSaveInvitationFeedback}
                        disabled={isGenerating || !invitationFeedback.trim()}
                      >
                        {isGenerating ? '處理中...' : '儲存修改'}
                      </button>
                      <button 
                        className="btn-secondary py-2 bg-gray-500"
                        onClick={handleCancelEdit}
                      >
                        取消
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* Info mode sidebar (guest details) */
                  <motion.div 
                    className="md:w-2/5 p-6 flex flex-col justify-between"
                    variants={sidebarVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    key="info"
                  >
                    <div>
                      <h3 className="text-xl font-medium mb-4 text-wedding-dark">賓客資訊</h3>
                      
                      {/* Guest information display */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-wedding-dark">姓名</h4>
                          <p>{selectedGuest.name}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-wedding-dark">關係</h4>
                          <p>{selectedGuest.relationship}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-wedding-dark">電子郵件</h4>
                          <p>{selectedGuest.email}</p>
                        </div>
                        
                        {selectedGuest.phone && (
                          <div>
                            <h4 className="font-medium text-wedding-dark">電話</h4>
                            <p>{selectedGuest.phone}</p>
                          </div>
                        )}
                        
                        {selectedGuest.howMet && (
                          <div>
                            <h4 className="font-medium text-wedding-dark">相識方式</h4>
                            <p>{selectedGuest.howMet}</p>
                          </div>
                        )}
                        
                        {selectedGuest.memories && (
                          <div>
                            <h4 className="font-medium text-wedding-dark">共同回憶</h4>
                            <p>{selectedGuest.memories}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="mt-6 space-y-4">
                      <button 
                        className="w-full btn-primary py-2"
                        onClick={handleEditMode}
                      >
                        編輯邀請函
                      </button>
                      
                      <button 
                        className="w-full btn-secondary py-2"
                        onClick={closeModal}
                      >
                        關閉
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