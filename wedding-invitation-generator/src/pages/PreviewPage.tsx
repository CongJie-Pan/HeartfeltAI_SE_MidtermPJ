import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressIndicator from '../components/ProgressIndicator';
import { useWedding } from '../context/WeddingContext';
import { GuestInfo } from '../types';

// 虛擬邀請函背景圖片
const templateImage = 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=600&auto=format&fit=crop';

// 邀請函預覽頁面組件
// 該頁面顯示邀請函預覽，並允許修改個性化邀請函文字
const PreviewPage: React.FC = () => {
  const { state, dispatch, nextStep, prevStep } = useWedding();
  const [selectedGuest, setSelectedGuest] = useState<GuestInfo | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [invitationFeedback, setInvitationFeedback] = useState('');
  
  // 頁面載入時，確保所有賓客都有邀請函文字
  useEffect(() => {
    // 檢查所有賓客，為沒有邀請函文字的賓客生成文字
    state.guests.forEach(guest => {
      if (!guest.invitationContent) {
        const content = generateInvitation(guest);
        dispatch({
          type: 'UPDATE_INVITATION',
          payload: {
            guestId: guest.id,
            content,
            status: 'generated'
          }
        });
      }
    });
  }, [state.guests, dispatch]);
  
  // 模擬生成邀請函內容
  const generateInvitation = (guest: GuestInfo) => {
    // 實際使用時，這應該是從API請求獲取的內容
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
  const handlePreviewInvitation = (guest: GuestInfo) => {
    // 如果邀請函文字尚未生成，則立即生成
    let currentGuest = guest;
    if (!guest.invitationContent) {
      const content = generateInvitation(guest);
      dispatch({
        type: 'UPDATE_INVITATION',
        payload: {
          guestId: guest.id,
          content,
          status: 'generated'
        }
      });
      // 更新當前賓客對象，包含新生成的內容
      currentGuest = {
        ...guest,
        invitationContent: content,
        status: 'generated'
      };
    }
    setSelectedGuest(currentGuest);
    setEditMode(false);
  };
  
  // 處理編輯模式切換
  const handleEditMode = () => {
    if (selectedGuest) {
      setInvitationFeedback('');
      setEditMode(true);
    }
  };
  
  // 處理保存編輯
  const handleSaveInvitationFeedback = () => {
    if (selectedGuest && invitationFeedback.trim()) {
      // 在實際應用中，這裡會發送反饋給AI並請求重新生成邀請函文字
      // 現在我們只是模擬這個過程
      
      // 模擬AI根據反饋生成的新文字 (這裡簡單示範)
      const newContent = `${selectedGuest.invitationContent}\n\n根據您的反饋，我們增加了這段個性化內容：\n${invitationFeedback}`;
      
      // 模擬更新文字內容
      dispatch({
        type: 'UPDATE_INVITATION',
        payload: {
          guestId: selectedGuest.id,
          content: newContent,
          status: 'edited'
        }
      });
      
      // 更新當前選中的賓客對象
      setSelectedGuest({
        ...selectedGuest,
        invitationContent: newContent,
        status: 'edited'
      });
      
      alert('感謝您的反饋！已根據您的需求更新邀請函文字。');
      setEditMode(false);
    }
  };
  
  // 處理取消編輯
  const handleCancelEdit = () => {
    setEditMode(false);
  };
  
  // 處理刪除賓客
  const handleDeleteGuest = (id: string) => {
    if (window.confirm('確定要刪除此賓客的邀請函？')) {
      dispatch({ type: 'REMOVE_GUEST', payload: id });
      if (selectedGuest && selectedGuest.id === id) {
        setSelectedGuest(null);
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
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className="text-gray-400 mb-2">點擊生成邀請函</span>
                    <button 
                      className="px-4 py-1 bg-wedding-primary rounded-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewInvitation(guest);
                      }}
                    >
                      生成
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {guest.status === 'edited' ? '已自訂文字' : 
                   guest.status === 'generated' ? '已生成文字' : 
                   guest.status === 'sent' ? '已發送' : '待生成'}
                </span>
                <button 
                  className="text-sm text-blue-500 hover:text-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewInvitation(guest);
                  }}
                >
                  {guest.invitationContent ? '查看預覽' : '生成邀請函'}
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
      
      {/* 邀請函預覽模態框 - 毛玻璃效果 */}
      <AnimatePresence>
        {selectedGuest && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            {/* 毛玻璃背景 */}
            <div 
              className="absolute inset-0 backdrop-blur-md bg-black bg-opacity-30"
              onClick={closeModal}
            ></div>
            
            {/* 預覽模態框 */}
            <motion.div
              className={`bg-white rounded-xl ${editMode ? 'max-w-3xl' : 'max-w-lg'} w-full z-10 overflow-hidden shadow-2xl flex ${editMode ? 'flex-row' : 'flex-col'}`}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 左側邀請函預覽區域 */}
              <div className={`${editMode ? 'w-1/2' : 'w-full'}`}>
                {/* 邀請函內容預覽 */}
                <div className="relative">
                  <div className="w-full aspect-[4/3] bg-wedding-secondary">
                    <img 
                      src={templateImage} 
                      alt="邀請函背景" 
                      className="w-full h-full object-cover opacity-30" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                      <div className="bg-white bg-opacity-70 p-6 rounded-lg w-full max-h-full overflow-y-auto">
                        <p className="text-sm text-wedding-dark whitespace-pre-line">
                          {selectedGuest.invitationContent}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 賓客資訊和按鈕 - 僅在非編輯模式下顯示 */}
                {!editMode && (
                  <div className="p-6">
                    <h3 className="text-xl font-medium mb-2 text-wedding-dark">
                      {selectedGuest.name} 的邀請函
                    </h3>
                    <p className="text-xs text-gray-500 mb-6">
                      {selectedGuest.relationship} | {selectedGuest.email}
                    </p>
                    
                    {/* 按鈕區域 */}
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={handleEditMode}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        修改邀請函文字
                      </button>
                      <button
                        onClick={closeModal}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        確認
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 右側編輯區域 - 僅在編輯模式下顯示 */}
              {editMode && (
                <motion.div 
                  className="w-1/2 border-l border-gray-200 bg-gray-50"
                  variants={sidebarVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="p-6">
                    <h3 className="text-xl font-medium mb-4 text-wedding-dark">
                      個性化邀請函文字
                    </h3>
                    
                    <p className="text-sm text-gray-500 mb-4">
                      為 <span className="font-medium">{selectedGuest.name}</span> 提供個性化邀請函文字建議
                    </p>
                    
                    <div className="bg-white border border-gray-200 p-3 rounded-lg mb-4 text-sm max-h-36 overflow-y-auto">
                      <p className="text-gray-700 whitespace-pre-line">
                        {selectedGuest.invitationContent}
                      </p>
                    </div>
                    
                    <textarea
                      className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wedding-accent focus:border-transparent resize-none mb-4"
                      value={invitationFeedback}
                      onChange={(e) => setInvitationFeedback(e.target.value)}
                      placeholder="請告訴我們您想要如何調整邀請函的文字內容？例如：語氣、用詞、增加特別的祝福語或提及特定回憶..."
                    />
                    
                    {/* 按鈕區域 */}
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSaveInvitationFeedback}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        重新生成文字
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PreviewPage; 