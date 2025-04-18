import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressIndicator from '../components/ProgressIndicator';
import { useWedding } from '../context/WeddingContext';
import { GuestInfo } from '../types';
import api from '../services/api';

// 虛擬邀請函背景圖片
const templateImage = 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=600&auto=format&fit=crop';

// 邀請函預覽頁面組件
// 該頁面顯示邀請函預覽，並允許修改個性化邀請函文字
const PreviewPage: React.FC = () => {
  const { state, dispatch, nextStep, prevStep } = useWedding();
  const [selectedGuest, setSelectedGuest] = useState<GuestInfo | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [invitationFeedback, setInvitationFeedback] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 頁面載入時，確保所有賓客都有邀請函文字
  useEffect(() => {
    const generateAllInvitations = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // 對於每個沒有邀請函文字的賓客，使用 API 生成
        for (const guest of state.guests) {
          if (!guest.invitationContent) {
            try {
              const response = await api.invitations.generate(guest.id);
              dispatch({
                type: 'UPDATE_INVITATION',
                payload: {
                  guestId: guest.id,
                  content: response.data.invitationContent,
                  status: 'generated'
                }
              });
            } catch (err) {
              console.error(`無法為賓客 ${guest.name} 生成邀請函:`, err);
              // 如果 API 請求失敗，使用本地生成的文字作為備用
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
        console.error('生成邀請函時出錯:', error);
        setError('無法生成部分邀請函，請稍後再試。');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    if (state.guests.length > 0) {
      generateAllInvitations();
    }
  }, [state.guests, dispatch]);
  
  // 生成後備邀請函內容（當 API 請求失敗時使用）
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
  
  // 處理預覽邀請函
  const handlePreviewInvitation = async (guest: GuestInfo) => {
    try {
      // 如果邀請函文字尚未生成，則使用 API 生成
      if (!guest.invitationContent) {
        setIsGenerating(true);
        setError(null);
        
        try {
          const response = await api.invitations.generate(guest.id);
          dispatch({
            type: 'UPDATE_INVITATION',
            payload: {
              guestId: guest.id,
              content: response.data.invitationContent,
              status: 'generated'
            }
          });
          
          // 更新當前賓客對象，包含新生成的內容
          guest = {
            ...guest,
            invitationContent: response.data.invitationContent,
            status: 'generated'
          };
        } catch (err) {
          console.error('生成邀請函時出錯:', err);
          // 如果 API 請求失敗，使用本地生成的文字作為備用
          const fallbackContent = generateFallbackInvitation(guest);
          dispatch({
            type: 'UPDATE_INVITATION',
            payload: {
              guestId: guest.id,
              content: fallbackContent,
              status: 'generated'
            }
          });
          
          guest = {
            ...guest,
            invitationContent: fallbackContent,
            status: 'generated'
          };
        }
      }
      
      setSelectedGuest(guest);
      setEditMode(false);
    } catch (error) {
      console.error('處理邀請函預覽時出錯:', error);
      setError('無法顯示邀請函預覽，請稍後再試。');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // 處理編輯模式切換
  const handleEditMode = () => {
    if (selectedGuest) {
      setInvitationFeedback('');
      setEditMode(true);
    }
  };
  
  // 處理保存編輯
  const handleSaveInvitationFeedback = async () => {
    if (selectedGuest && invitationFeedback.trim()) {
      try {
        setIsGenerating(true);
        setError(null);
        
        // 使用 API 更新邀請函文字
        const updatedContent = `${selectedGuest.invitationContent}\n\n根據您的反饋，我們增加了這段個性化內容：\n${invitationFeedback}`;
        await api.invitations.update(selectedGuest.id, updatedContent);
        
        // 更新 Redux 狀態
        dispatch({
          type: 'UPDATE_INVITATION',
          payload: {
            guestId: selectedGuest.id,
            content: updatedContent,
            status: 'edited'
          }
        });
        
        // 更新當前選中的賓客對象
        setSelectedGuest({
          ...selectedGuest,
          invitationContent: updatedContent,
          status: 'edited'
        });
        
        alert('感謝您的反饋！已根據您的需求更新邀請函文字。');
        setEditMode(false);
      } catch (error) {
        console.error('更新邀請函文字時出錯:', error);
        setError('無法更新邀請函，請稍後再試。');
      } finally {
        setIsGenerating(false);
      }
    }
  };
  
  // 處理取消編輯
  const handleCancelEdit = () => {
    setEditMode(false);
  };
  
  // 處理刪除賓客
  const handleDeleteGuest = async (id: string) => {
    if (window.confirm('確定要刪除此賓客的邀請函？')) {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // 呼叫 API 刪除賓客
        await api.guests.delete(id);
        
        // 更新 Redux 狀態
        dispatch({ type: 'REMOVE_GUEST', payload: id });
        
        if (selectedGuest && selectedGuest.id === id) {
          setSelectedGuest(null);
        }
      } catch (error) {
        console.error('刪除賓客時出錯:', error);
        setError('無法刪除賓客，請稍後再試。');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };
  
  // 關閉預覽模態框
  const closeModal = () => {
    setSelectedGuest(null);
    setEditMode(false);
  };
  
  // 檢查是否可以繼續
  const canProceed = state.guests.length > 0 && state.guests.every(guest => guest.invitationContent);
  
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
  
  // 卡片動畫
  const cardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
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
  
  // 側邊欄動畫
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
      
      {/* 進度指示器 */}
      <ProgressIndicator />
      
      {/* 錯誤訊息顯示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* 賓客邀請函網格 */}
      <div className="mt-8">
        <h2 className="text-xl font-medium mb-4 text-wedding-dark">賓客邀請函預覽</h2>
        <p className="text-sm text-gray-500 mb-6">點擊查看邀請函預覽，可在右側修改個性化文字內容</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.guests.map((guest) => (
            <motion.div 
              key={guest.id} 
              className="card cursor-pointer relative hover:shadow-lg"
              variants={cardVariants}
              onClick={() => handlePreviewInvitation(guest)}
              whileHover={{ y: -5 }}
            >
              {/* 刪除按鈕 */}
              <button
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGuest(guest.id);
                }}
              >
                &times;
              </button>
              
              <h3 className="font-medium text-lg mb-2">{guest.name}</h3>
              <p className="text-xs text-gray-500 mb-4">{guest.relationship} | {guest.email}</p>
              
              {/* 邀請函預覽 */}
              <div className="h-48 mb-3 overflow-hidden rounded-lg shadow-sm flex items-center justify-center bg-wedding-secondary">
                {guest.invitationContent ? (
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
                  <div className="flex flex-col items-center justify-center space-y-2">
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wedding-dark"></div>
                        <p className="text-xs text-wedding-dark">正在生成邀請函...</p>
                      </>
                    ) : (
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
              
              {/* 狀態標籤 */}
              <div className="flex justify-between items-center">
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
      
      {/* 導航按鈕 */}
      <div className="flex justify-between mt-12">
        <button
          onClick={prevStep}
          className="px-6 py-2 border border-wedding-dark text-wedding-dark rounded-lg hover:bg-wedding-dark hover:text-white transition-colors"
        >
          上一步
        </button>
        <button
          onClick={nextStep}
          className={`btn-primary ${!canProceed ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!canProceed}
        >
          確認邀請函，下一步
        </button>
      </div>
      
      {/* 預覽模態框 */}
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
              onClick={(e) => e.stopPropagation()}
            >
              {/* 邀請函預覽區域 */}
              <div className="md:w-3/5 p-6 bg-wedding-secondary relative">
                <h3 className="text-xl font-medium mb-4 text-wedding-dark">給 {selectedGuest.name} 的邀請函</h3>
                
                {isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wedding-dark"></div>
                    <p className="text-wedding-dark">正在處理邀請函，請稍候...</p>
                  </div>
                ) : (
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
              
              {/* 編輯區域 */}
              <AnimatePresence mode="wait">
                {editMode ? (
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
                    
                    <textarea 
                      className="w-full h-48 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-wedding-accent"
                      placeholder="例如：希望增加更多關於我們共同回憶的內容，或者調整稱呼方式..."
                      value={invitationFeedback}
                      onChange={(e) => setInvitationFeedback(e.target.value)}
                    ></textarea>
                    
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