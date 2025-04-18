import React from 'react';
import { motion } from 'framer-motion';
import FallingPetals from '../components/FallingPetals';
import { useWedding } from '../context/WeddingContext';

// 歡迎頁面組件
// 該頁面是用戶第一次進入系統看到的頁面，提供系統簡介和開始按鈕
const WelcomePage: React.FC = () => {
  const { nextStep } = useWedding();
  
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
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      {/* 花瓣飄落背景 */}
      <FallingPetals />
      
      <motion.div
        className="max-w-3xl z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 標題 */}
        <motion.h1 
          className="text-4xl md:text-6xl font-serif font-bold mb-4 text-wedding-dark"
          variants={itemVariants}
        >
          夢幻婚禮邀請函生成系統
        </motion.h1>
        
        {/* 副標題 */}
        <motion.h2 
          className="text-xl md:text-2xl font-light mb-8 text-wedding-dark"
          variants={itemVariants}
        >
          透過AI為您的賓客打造專屬邀請函
        </motion.h2>
        
        {/* 簡介文字 */}
        <motion.p 
          className="text-lg mb-12 max-w-2xl mx-auto text-wedding-text"
          variants={itemVariants}
        >
          我們的系統將協助您輕鬆創建專屬於您的婚禮邀請函。
          根據您提供的新人資料和賓客資訊，我們的AI將為每位賓客生成獨特的邀請函，
          讓您的婚禮邀請更加個性化和難忘。
        </motion.p>
        
        {/* 開始按鈕 */}
        <motion.button
          className="btn-primary text-lg px-12 py-4 rounded-full transform transition-transform hover:scale-105 hover:-translate-y-1"
          onClick={nextStep}
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          開始使用
        </motion.button>
      </motion.div>
    </div>
  );
};

export default WelcomePage; 