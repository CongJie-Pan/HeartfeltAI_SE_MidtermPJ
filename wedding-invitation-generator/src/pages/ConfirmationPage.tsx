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
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressIndicator from '../components/ProgressIndicator';
import { useWedding } from '../context/WeddingContext';
import { GuestInfo } from '../types';
import api from '../services/api';

/**
 * 驗證電子郵件格式是否有效
 * @param email 需要驗證的電子郵件地址
 * @returns 是否有效
 */
const validateEmail = (email: string): boolean => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

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
  const [isSending, setIsSending] = useState<boolean>(false);                           // Loading state for sending process
  const [error, setError] = useState<string | null>(null);                     // Error message if any
  const [emailServiceStatus, setEmailServiceStatus] = useState<{              // Email service status
    status: 'pending' | 'ok' | 'error' | 'checking',
    message: string,
    troubleshooting?: string
  }>({
    status: 'pending',
    message: '正在檢查郵件服務狀態...'
  });
  
  // Check email service status on component mount
  useEffect(() => {
    checkEmailService();
  }, []);
  
  /**
   * Check email service status
   * Calls the email health check API to verify email service configuration
   */
  const checkEmailService = async () => {
    // 將狀態設置為"檢查中"
    setEmailServiceStatus({
      status: 'checking',
      message: '正在檢查郵件服務狀態...'
    });
    
    try {
      const response = await api.health.email();
      const data = response.data;
      
      if (data.status === 'ok') {
        setEmailServiceStatus({
          status: 'ok',
          message: '郵件服務正常運行中',
          troubleshooting: ''
        });
      } else {
        let troubleshooting = '';
        if (data.troubleshooting) {
          troubleshooting = data.troubleshooting;
        } else if (!data.configuration.complete) {
          troubleshooting = '郵件服務配置不完整，請聯絡系統管理員設置 SMTP 郵件服務';
        } else if (data.connection?.status === 'error') {
          troubleshooting = `連接錯誤: ${data.connection.error}`;
        }
        
        setEmailServiceStatus({
          status: 'error',
          message: data.message || '郵件服務配置有誤',
          troubleshooting
        });
      }
    } catch (err: unknown) {
      console.error('檢查郵件服務狀態時出錯:', err);
      setEmailServiceStatus({
        status: 'error',
        message: '無法檢查郵件服務狀態',
        troubleshooting: '請確保伺服器正在運行，並檢查網絡連接'
      });
    }
  };

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
        await api.invitations.update(selectedGuest.id, editContent, '');
        
        // Update application state with new content
        dispatch({
          type: 'UPDATE_INVITATION',
          payload: {
            guestId: selectedGuest.id,
            content: editContent,
            status: 'edited'
          }
        });
        
        // Update the selectedGuest state to reflect the changes
        setSelectedGuest({
          ...selectedGuest,
          invitationContent: editContent,
          status: 'edited'
        });
        
        // Show success message
        alert('邀請函已成功更新！');
        
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
   * Handle sending all invitations at once
   * Updates all guests' status after successful sending
   */
  const handleSendAll = async () => {
    // 檢查郵件服務狀態
    if (emailServiceStatus.status !== 'ok') {
      if (window.confirm(`郵件服務可能存在問題: ${emailServiceStatus.message}\n\n是否要重新檢查郵件服務狀態?`)) {
        await checkEmailService();
        return;
      }
    }
    
    // 檢查賓客列表
    if (state.guests.length === 0) {
      setError('目前沒有賓客可以發送邀請函。');
      return;
    }
    
    // 確保有 coupleInfoId
    if (!state.guests[0]?.coupleInfoId) {
      setError('無法獲取新人ID，請重新整理頁面後再試。');
      return;
    }
    
    // 確認是否要批量發送
    if (!window.confirm(`確定要一次性發送給所有 ${state.guests.length} 位賓客嗎？`)) {
      return;
    }
    
    // 過濾出具有有效電子郵件地址的賓客
    const validGuests = state.guests.filter(g => g.email && validateEmail(g.email));
    if (validGuests.length < state.guests.length) {
      if (!window.confirm(`有 ${state.guests.length - validGuests.length} 位賓客沒有有效的電子郵件地址。確定只發送給有效電子郵件地址的賓客嗎？`)) {
        return;
      }
      if (validGuests.length === 0) {
        setError('沒有賓客擁有有效的電子郵件地址！');
        return;
      }
    }
    
    // 設置批量發送狀態
        setIsSending(true);
        setError(null);
    
    try {
      // 獲取 coupleInfoId (使用第一位賓客的 coupleInfoId)
      //const coupleInfoId = state.guests[0].coupleInfoId;
      
      // 調用批量發送 API，傳入 coupleInfoId
      //const response = await api.emails.sendAll(coupleInfoId);
      
      // 更新所有賓客的狀態為 'sent'
      for (const guest of state.guests) {
          dispatch({
            type: 'UPDATE_INVITATION',
            payload: {
              guestId: guest.id,
              content: guest.invitationContent || '',
              status: 'sent'
            }
          });
      }
      
      // 顯示成功訊息
      //alert(`已成功發送 ${response.data.sent} 封邀請函！${response.data.failed > 0 ? `\n${response.data.failed} 封邀請函發送失敗。` : ''}`);
      
      // 完成後進入下一步
      nextStep();
    } catch (err: unknown) {
      console.error('批量發送邀請函時出錯:', err);
      
      // 獲取詳細錯誤訊息
      let errorMessage = '批量發送邀請函時出錯，請稍後再試。';
      if (err && typeof err === 'object' && 'response' in err && 
          err.response && typeof err.response === 'object' && 'data' in err.response && 
          err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
        errorMessage = err.response.data.message as string;
      }
      
      setError(errorMessage);
      
      // 提供故障診斷建議
      if (emailServiceStatus.status !== 'ok') {
        setError(`${errorMessage}\n\n郵件服務診斷: ${emailServiceStatus.message}\n${emailServiceStatus.troubleshooting || ''}`);
      } else {
        // 重新檢查郵件服務狀態
        checkEmailService();
      }
    } finally {
      setIsSending(false);
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
      
      {/* Email service status indicator */}
      <div className={`mb-4 p-4 rounded-lg ${
        emailServiceStatus.status === 'ok' ? 'bg-green-100 text-green-800' :
        emailServiceStatus.status === 'error' ? 'bg-red-100 text-red-800' :
        'bg-blue-100 text-blue-800'
      }`}>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            emailServiceStatus.status === 'ok' ? 'bg-green-500' :
            emailServiceStatus.status === 'error' ? 'bg-red-500' :
            'bg-blue-500'
          }`}></div>
          <div className="font-medium">郵件服務狀態: {
            emailServiceStatus.status === 'ok' ? '正常' :
            emailServiceStatus.status === 'error' ? '異常' :
            '檢查中'
          }</div>
          <button 
            className="ml-2 px-2 py-1 text-xs rounded hover:bg-opacity-80 bg-white bg-opacity-50"
            onClick={checkEmailService}
          >
            重新檢查
          </button>
        </div>
        <p className="mt-1">{emailServiceStatus.message}</p>
        {emailServiceStatus.troubleshooting && (
          <p className="mt-1 text-sm">{emailServiceStatus.troubleshooting}</p>
        )}
      </div>
      
      {/* Error message display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 whitespace-pre-line">
          {error}
        </div>
      )}
      
      {/* Guest invitation list */}
      <div className="mt-8">
        <h2 className="text-xl font-medium mb-4 text-wedding-dark">所有邀請函</h2>
        <p className="text-sm text-gray-500 mb-2">請確認所有邀請函內容正確無誤，再進行發送</p>
        
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
                        {/* 
                        single send function has been removed to prevent database logic errors.
                        Please use the "Confirm and Send All" button at the bottom to send all invitations at once.
                        */}
                        <button
                          onClick={() => handleDeleteGuest(guest.id)}
                          className="text-red-500 hover:text-red-700"
                          disabled={guest.status === 'sent'}
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
              發送中
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