/**
 * Welcome Page Component
 * 
 * This is the first page users see when accessing the application.
 * It provides a brief introduction to the wedding invitation generator
 * and a button to start the process.
 * 
 * Features:
 * - Animated entrance using Framer Motion
 * - Decorative falling petals background
 * - Clear call-to-action to begin the workflow
 */
import React from 'react';
import { motion } from 'framer-motion';
import FallingPetals from '../components/FallingPetals';
import { useWedding } from '../context/WeddingContext';

/**
 * WelcomePage Component
 * 
 * Landing page that introduces the application's purpose
 * and provides the entry point to the invitation creation workflow.
 * 
 * @returns {JSX.Element} The welcome page component
 */
const WelcomePage: React.FC = () => {
  // Get the navigation function from wedding context
  const { nextStep } = useWedding();
  
  /**
   * Animation configuration using Framer Motion
   * 
   * Framer Motion is a popular React animation library that simplifies
   * creating smooth, interactive animations with a declarative API.
   */
  
  // Parent container animation with staggered children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.8,
        staggerChildren: 0.3  // Delay between each child element's animation
      }
    }
  };
  
  // Individual element animations (titles, text, buttons)
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },  // Start 20px below final position and invisible
    visible: { 
      y: 0,                         // Move to final position
      opacity: 1,                    
      transition: { duration: 0.5 }  // Animation takes 0.5 seconds
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      {/* Decorative falling petals background animation */}
      <FallingPetals />
      
      {/* Content container with staggered entrance animation */}
      <motion.div
        className="max-w-3xl z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Main title with animation */}
        <motion.h1 
          className="text-4xl md:text-6xl font-serif font-bold mb-4 text-wedding-dark"
          variants={itemVariants}
        >
          夢幻婚禮邀請函生成系統
        </motion.h1>
        
        {/* Subtitle with animation */}
        <motion.h2 
          className="text-xl md:text-2xl font-light mb-8 text-wedding-dark"
          variants={itemVariants}
        >
          透過AI為您的賓客打造專屬邀請函
        </motion.h2>
        
        {/* Introduction text with animation */}
        <motion.p 
          className="text-lg mb-12 max-w-2xl mx-auto text-wedding-text"
          variants={itemVariants}
        >
          我們的系統將協助您輕鬆創建專屬於您的婚禮邀請函。
          根據您提供的新人資料和賓客資訊，我們的AI將為每位賓客生成獨特的邀請函，
          讓您的婚禮邀請更加個性化和難忘。
        </motion.p>
        
        {/* Call-to-action button with animation and interactive effects */}
        <motion.button
          className="btn-primary text-lg px-12 py-4 rounded-full transform transition-transform hover:scale-105 hover:-translate-y-1"
          onClick={nextStep}
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}  // Scale up slightly on hover
          whileTap={{ scale: 0.95 }}    // Scale down slightly when clicked
        >
          開始使用
        </motion.button>
      </motion.div>
    </div>
  );
};

export default WelcomePage; 