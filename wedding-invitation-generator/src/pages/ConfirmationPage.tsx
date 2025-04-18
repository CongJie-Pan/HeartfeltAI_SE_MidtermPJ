import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressIndicator from '../components/ProgressIndicator';
import { useWedding } from '../context/WeddingContext';
import { GuestInfo } from '../types';

// 最終確認頁面組件
// 提供最終的邀請函確認，展示將要發送的內容，並允許刪除或編輯
const ConfirmationPage: React.FC = () => {
  const { state, dispatch, nextStep, prevStep } = useWedding();
  const [selectedGuest, setSelectedGuest] = useState<GuestInfo | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  
  // 處理刪除賓客
  const handleDeleteGuest = (id: string) => {
    if (window.confirm('確定要刪除此賓客的邀請函？')) {
      dispatch({ type: 'REMOVE_GUEST', payload: id });
      if (selectedGuest && selectedGuest.id === id) {
        setSelectedGuest(null);
      }
    }
  };
  
  // 預覽邀請函
  const handlePreview = (guest: GuestInfo) => {
    setSelectedGuest(guest);
    setEditMode(false);
  };
  
  // 關閉模態框
  const closeModal = () => {
    setSelectedGuest(null);
    setEditMode(false);
  };
  
  // 處理編輯模式切換
  const handleEditMode = () => {
    if (selectedGuest && selectedGuest.invitationContent) {
      setEditContent(selectedGuest.invitationContent);
      setEditMode(true);
    }
  };
  
  // 處理保存編輯
  const handleSaveEdit = () => {
    if (selectedGuest && editContent.trim()) {
      dispatch({
        type: 'UPDATE_INVITATION',
        payload: {
          guestId: selectedGuest.id,
          content: editContent,
          status: 'edited'
        }
      });
      setEditMode(false);
    }
  };
  
  // 處理取消編輯
  const handleCancelEdit = () => {
    setEditMode(false);
  };
  
  // 處理發送所有邀請函
  const handleSendAll = () => {
    if (window.confirm(`確定要發送${state.guests.length}份邀請函嗎？`)) {
      setIsSending(true);
      
      // 模擬發送過程
      let count = 0;
      const interval = setInterval(() => {
        if (count < state.guests.length) {
          // 更新當前賓客的狀態
          dispatch({
            type: 'UPDATE_INVITATION',
            payload: {
              guestId: state.guests[count].id,
              content: state.guests[count].invitationContent || '',
              status: 'sent'
            }
          });
          
          count++;
          setSentCount(count);
        } else {
          clearInterval(interval);
          setIsSending(false);
          // 所有邀請函發送完畢，進入完成頁面
          nextStep();
        }
      }, 500); // 每500毫秒模擬發送一封邀請函
    }
  };
  
  // 檢查是否可以發送
  const canSend = state.guests.length > 0 && state.guests.every(guest => guest.invitationContent);
  
  // 動畫配置
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
  
  // 表格行動畫
  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  };
  
  // 模態框動畫
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
      
      {/* 進度指示器 */}
      <ProgressIndicator />
      
      {/* 賓客邀請函列表 */}
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
      
      {/* 導航和發送按鈕 */}
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
      
      {/* 邀請函預覽模態框 */}
      <AnimatePresence>
        {selectedGuest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="absolute inset-0" onClick={closeModal}></div>
            
            <motion.div
              className="bg-white rounded-xl max-w-2xl w-full z-10 overflow-hidden"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="border-b pb-3 mb-4">
                  <h3 className="text-xl font-medium mb-1 text-wedding-dark">電子郵件預覽</h3>
                  <p className="text-sm text-gray-500">
                    收件人：{selectedGuest.name} ({selectedGuest.email})
                  </p>
                </div>
                
                <div className="border rounded-lg p-4 mb-4">
                  <div className="border-b pb-2 mb-3">
                    <div className="font-medium">主旨：{state.coupleInfo.groomName} & {state.coupleInfo.brideName} 的婚禮邀請函</div>
                    <div className="text-xs text-gray-500">
                      寄件人：{state.coupleInfo.groomName} & {state.coupleInfo.brideName}
                    </div>
                  </div>
                  
                  {editMode ? (
                    <textarea
                      className="w-full h-64 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wedding-accent focus:border-transparent resize-none"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                  ) : (
                    <div className="text-sm whitespace-pre-line">
                      {selectedGuest.invitationContent}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3">
                  {editMode ? (
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