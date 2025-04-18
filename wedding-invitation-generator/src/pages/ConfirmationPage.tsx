/**
 * Confirmation Page
 * 
 * This page allows users to review, edit, and send all generated invitations
 * in the final step before completion. It provides both bulk and individual
 * invitation management capabilities, with real-time status updates.
 * 
 * Key features:
 * - Table view of all guests and their invitation status
 * - Preview and edit functionality for individual invitations
 * - Individual and batch sending capabilities
 * - Real-time progress updates during sending process
 * - Error handling and user feedback
 * 
 * This component uses Framer Motion for animations and modal transitions.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressIndicator from '../components/ProgressIndicator';
import { useWedding } from '../context/WeddingContext';
import { GuestInfo } from '../types';
import api from '../services/api';

/**
 * ConfirmationPage Component
 * 
 * The final review page before sending invitations. Provides a comprehensive
 * interface for managing and sending all invitations.
 * 
 * @returns {JSX.Element} The confirmation page component
 */
const ConfirmationPage: React.FC = () => {
  const { state, dispatch, nextStep, prevStep } = useWedding();
  
  // Local state for UI management
  const [selectedGuest, setSelectedGuest] = useState<GuestInfo | null>(null);  // Currently selected guest for preview/edit
  const [editContent, setEditContent] = useState('');                          // Editable invitation content
  const [editMode, setEditMode] = useState(false);                             // Whether edit mode is active
  const [isSending, setIsSending] = useState(false);                           // Loading state for sending process
  const [sentCount, setSentCount] = useState(0);                               // Counter for sent invitations
  const [error, setError] = useState<string | null>(null);                     // Error message if any

  /**
   * Delete a guest and their invitation
   * Confirms with the user before proceeding with deletion
   * 
   * @param {string} id - ID of the guest to delete
   */
  const handleDeleteGuest = async (id: string) => {
    if (window.confirm('確定要刪除此賓客的邀請函？')) {
      try {
        // Call API to delete the guest
        await api.guests.delete(id);
        
        // Update application state to remove the guest
        dispatch({ type: 'REMOVE_GUEST', payload: id });
        
        // Close modal if currently viewing the deleted guest
        if (selectedGuest && selectedGuest.id === id) {
          setSelectedGuest(null);
        }
      } catch (error) {
        console.error('刪除賓客時出錯:', error);
        setError('無法刪除賓客，請稍後再試。');
      }
    }
  };
  
  /**
   * Display invitation preview for a specific guest
   * Opens the modal with the selected guest's invitation
   * 
   * @param {GuestInfo} guest - Guest object to preview
   */
  const handlePreview = (guest: GuestInfo) => {
    setSelectedGuest(guest);
    setEditMode(false);
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
   * Switch to edit mode for the current invitation
   * Initializes the edit form with the current invitation content
   */
  const handleEditMode = () => {
    if (selectedGuest && selectedGuest.invitationContent) {
      setEditContent(selectedGuest.invitationContent);
      setEditMode(true);
    }
  };
  
  /**
   * Save edited invitation content
   * Updates the invitation content both in the API and local state
   */
  const handleSaveEdit = async () => {
    if (selectedGuest && editContent.trim()) {
      try {
        setError(null);
        
        // Call API to update the invitation content
        await api.invitations.update(selectedGuest.id, editContent);
        
        // Update application state with new content
        dispatch({
          type: 'UPDATE_INVITATION',
          payload: {
            guestId: selectedGuest.id,
            content: editContent,
            status: 'edited'
          }
        });
        
        // Exit edit mode after saving
        setEditMode(false);
      } catch (error) {
        console.error('更新邀請函文字時出錯:', error);
        setError('無法更新邀請函，請稍後再試。');
      }
    }
  };
  
  /**
   * Cancel edit mode without saving changes
   * Returns to preview mode
   */
  const handleCancelEdit = () => {
    setEditMode(false);
  };
  
  /**
   * Send all invitations in batch
   * Confirms with the user before starting the sending process
   * Updates progress in real-time
   */
  const handleSendAll = async () => {
    if (window.confirm(`確定要發送${state.guests.length}份邀請函嗎？`)) {
      try {
        setIsSending(true);
        setError(null);
        setSentCount(0);
        
        // Call API to send all invitations
        await api.emails.sendAll();
        
        // Update the status of each guest in sequence
        // In a real implementation, this might be handled by websockets
        // or polling to get updates from the server
        for (let i = 0; i < state.guests.length; i++) {
          const guest = state.guests[i];
          
          // Update the current guest's status to 'sent'
          dispatch({
            type: 'UPDATE_INVITATION',
            payload: {
              guestId: guest.id,
              content: guest.invitationContent || '',
              status: 'sent'
            }
          });
          
          // Increment the sent counter
          setSentCount(i + 1);
          
          // Add a slight delay between updates for visual feedback
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Move to the complete page after all invitations are sent
        nextStep();
      } catch (error) {
        console.error('發送邀請函時出錯:', error);
        setError('發送邀請函時出錯，請稍後再試。');
      } finally {
        setIsSending(false);
      }
    }
  };
  
  /**
   * Send invitation to a single guest
   * Updates the guest's status after successful sending
   * 
   * @param {string} guestId - ID of the guest to send invitation to
   */
  const handleSendOne = async (guestId: string) => {
    try {
      const guest = state.guests.find(g => g.id === guestId);
      if (!guest) return;
      
      setError(null);
      
      // Call API to send individual invitation
      await api.emails.send(guestId);
      
      // Update the guest's status to 'sent'
      dispatch({
        type: 'UPDATE_INVITATION',
        payload: {
          guestId,
          content: guest.invitationContent || '',
          status: 'sent'
        }
      });
      
      // Show success message
      alert(`已成功發送給 ${guest.name} 的邀請函！`);
    } catch (error) {
      console.error('發送邀請函時出錯:', error);
      setError(`發送給此賓客的邀請函時出錯，請稍後再試。`);
    }
  };
  
  // Determine if the "Send All" button should be enabled
  // All guests must have generated invitation content
  const canSend = state.guests.length > 0 && state.guests.every(guest => guest.invitationContent);
  
  /**
   * Animation configurations using Framer Motion
   * These define how elements will animate when they appear on screen
   */
  
  // Main container animation
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
  
  // Table row animation
  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  };
  
  // Modal animation
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
  
  return (
    <motion.div
      className="min-h-screen py-12 px-4 max-w-6xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <h1 className="text-3xl font-serif text-center font-bold mb-8 text-wedding-dark">最終確認與發送</h1>
      
      {/* Progress indicator to show current step */}
      <ProgressIndicator />
      
      {/* Error message display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Guest invitation list */}
      <div className="mt-8">
        <h2 className="text-xl font-medium mb-4 text-wedding-dark">所有邀請函</h2>
        <p className="text-sm text-gray-500 mb-6">請確認所有邀請函內容正確無誤，再進行發送</p>
        
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">賓客姓名</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">關係</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">電子郵件</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">狀態</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {state.guests.map((guest) => (
                  <motion.tr 
                    key={guest.id}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm">{guest.name}</td>
                    <td className="px-4 py-3 text-sm">{guest.relationship}</td>
                    <td className="px-4 py-3 text-sm">{guest.email}</td>
                    <td className="px-4 py-3 text-sm">
                      {/* Status badge with conditional styling */}
                      <span className={`px-2 py-1 rounded-full text-xs
                        ${guest.status === 'edited' ? 'bg-blue-100 text-blue-800' : 
                         guest.status === 'generated' ? 'bg-green-100 text-green-800' : 
                         guest.status === 'sent' ? 'bg-purple-100 text-purple-800' : 
                         'bg-gray-100 text-gray-800'}`}
                      >
                        {guest.status === 'edited' ? '已編輯' : 
                         guest.status === 'generated' ? '已生成' : 
                         guest.status === 'sent' ? '已發送' : '待生成'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePreview(guest)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => handleSendOne(guest.id)}
                          className="text-green-500 hover:text-green-700"
                          disabled={guest.status === 'sent' || isSending}
                        >
                          發送
                        </button>
                        <button
                          onClick={() => handleDeleteGuest(guest.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Navigation and send buttons */}
      <div className="flex justify-between mt-12">
        <button
          onClick={prevStep}
          className="px-6 py-2 border border-wedding-dark text-wedding-dark rounded-lg hover:bg-wedding-dark hover:text-white transition-colors"
          disabled={isSending}
        >
          上一步
        </button>
        <button
          onClick={handleSendAll}
          disabled={!canSend || isSending}
          className={`btn-primary flex items-center justify-center min-w-[150px]
            ${(!canSend || isSending) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSending ? (
            <>
              {/* Loading spinner during sending process */}
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              發送中 ({sentCount}/{state.guests.length})
            </>
          ) : (
            '確認並發送全部'
          )}
        </button>
      </div>
      
      {/* Invitation preview/edit modal */}
      <AnimatePresence>
        {selectedGuest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            {/* Backdrop that closes modal when clicked */}
            <div className="absolute inset-0" onClick={closeModal}></div>
            
            <motion.div
              className="bg-white rounded-xl max-w-2xl w-full z-10 overflow-hidden"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling to backdrop
            >
              <div className="p-6">
                <div className="border-b pb-3 mb-4">
                  <h3 className="text-xl font-medium mb-1 text-wedding-dark">電子郵件預覽</h3>
                  <p className="text-sm text-gray-500">
                    收件人：{selectedGuest.name} ({selectedGuest.email})
                  </p>
                </div>
                
                {/* Email content preview/edit area */}
                <div className="border rounded-lg p-4 mb-4">
                  <div className="border-b pb-2 mb-3">
                    <div className="font-medium">主旨：{state.coupleInfo.groomName} & {state.coupleInfo.brideName} 的婚禮邀請函</div>
                    <div className="text-xs text-gray-500">
                      寄件人：{state.coupleInfo.groomName} & {state.coupleInfo.brideName}
                    </div>
                  </div>
                  
                  {editMode ? (
                    // Editable textarea when in edit mode
                    <textarea
                      className="w-full h-64 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wedding-accent focus:border-transparent resize-none"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                  ) : (
                    // Read-only view when in preview mode
                    <div className="text-sm whitespace-pre-line">
                      {selectedGuest.invitationContent}
                    </div>
                  )}
                </div>
                
                {/* Action buttons that change based on current mode */}
                <div className="flex justify-end space-x-3">
                  {editMode ? (
                    // Edit mode buttons
                    <>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="btn-primary"
                      >
                        保存編輯
                      </button>
                    </>
                  ) : (
                    // Preview mode buttons
                    <>
                      <button
                        onClick={closeModal}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                      >
                        關閉
                      </button>
                      <button
                        onClick={handleEditMode}
                        className="btn-primary"
                      >
                        編輯內容
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ConfirmationPage; 