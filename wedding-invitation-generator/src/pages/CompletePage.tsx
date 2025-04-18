import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWedding } from '../context/WeddingContext';
import { Step } from '../types';
import ProgressIndicator from '../components/ProgressIndicator';
import FallingPetals from '../components/FallingPetals';

// 完成頁面組件
// 這是整個流程的最後一頁，顯示成功發送的提示及統計資訊
const CompletePage: React.FC = () => {
  const { state, dispatch } = useWedding();
  
  // 進入頁面時確保步驟正確
  useEffect(() => {
    dispatch({ type: 'SET_STEP', payload: Step.Complete });
  }, [dispatch]);
  
  // 成功發送的數量
  const sentCount = state.guests.filter(guest => guest.status === 'sent').length;
  
  // 動畫配置
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.8,
        staggerChildren: 0.3
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };
  
  // 禮花動畫
  const fireWorkVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: [0, 1.2, 1],
      opacity: [0, 1, 0.8],
      transition: { 
        duration: 0.8,
        repeat: Infinity,
        repeatDelay: 3 
      }
    }
  };
  
  // 模擬禮花位置
  const fireworks = [
    { id: 1, color: '#FFD1DC', top: '15%', left: '10%', delay: 0 },
    { id: 2, color: '#FFA07A', top: '25%', left: '85%', delay: 0.5 },
    { id: 3, color: '#FFC0CB', top: '60%', left: '15%', delay: 1 },
    { id: 4, color: '#FFB6C1', top: '70%', left: '80%', delay: 1.5 },
    { id: 5, color: '#FFD1DC', top: '40%', left: '50%', delay: 2 },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景效果 */}
      <FallingPetals />
      
      {/* 禮花效果 */}
      {fireworks.map((fw) => (
        <motion.div
          key={fw.id}
          className="absolute w-20 h-20 rounded-full opacity-70 pointer-events-none"
          style={{ 
            top: fw.top, 
            left: fw.left, 
            backgroundColor: fw.color,
            boxShadow: `0 0 30px ${fw.color}`  
          }}
          variants={fireWorkVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: fw.delay }}
        />
      ))}
      
      <div className="container mx-auto py-12 px-4 min-h-screen flex flex-col items-center justify-center z-10 relative">
        {/* 進度指示器 */}
        <ProgressIndicator />
        
        <motion.div
          className="max-w-2xl text-center mt-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 成功圖標 */}
          <motion.div 
            className="mb-8 mx-auto"
            variants={itemVariants}
          >
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-14 h-14 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </motion.div>
          
          {/* 標題 */}
          <motion.h1 
            className="text-4xl font-serif font-bold mb-4 text-wedding-dark"
            variants={itemVariants}
          >
            恭喜！所有邀請函已成功發送
          </motion.h1>
          
          {/* 副標題 */}
          <motion.h2 
            className="text-xl font-light mb-8 text-wedding-dark"
            variants={itemVariants}
          >
            您的賓客將收到獨一無二的邀請函
          </motion.h2>
          
          {/* 統計資訊 */}
          <motion.div 
            className="bg-white rounded-xl shadow-md p-6 mb-10"
            variants={itemVariants}
          >
            <p className="text-lg mb-4">成功發送 <span className="font-bold text-2xl text-wedding-dark">{sentCount}</span> 份邀請函</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-4 bg-wedding-secondary bg-opacity-30 rounded-lg">
                <p className="font-medium">新郎</p>
                <p>{state.coupleInfo.groomName}</p>
              </div>
              <div className="text-center p-4 bg-wedding-secondary bg-opacity-30 rounded-lg">
                <p className="font-medium">新娘</p>
                <p>{state.coupleInfo.brideName}</p>
              </div>
              <div className="text-center p-4 bg-wedding-secondary bg-opacity-30 rounded-lg col-span-2">
                <p className="font-medium">婚禮日期</p>
                <p>{state.coupleInfo.weddingDate ? new Date(state.coupleInfo.weddingDate).toLocaleDateString('zh-TW') : '未設定'} {state.coupleInfo.weddingTime}</p>
              </div>
            </div>
          </motion.div>
          
          {/* 按鈕區域 */}
          <motion.div
            className="flex justify-center space-x-4"
            variants={itemVariants}
          >
            <a
              href="/"
              className="btn-primary"
              onClick={(e) => {
                e.preventDefault();
                window.location.reload();
              }}
            >
              返回首頁
            </a>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default CompletePage; 