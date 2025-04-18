import React, { useState, useEffect } from 'react';
import { Petal } from '../types';

// 花瓣飄落動畫組件
// 該組件創建多個花瓣元素，設置不同的動畫參數，使其在頁面上有飄落效果
const FallingPetals: React.FC = () => {
  const [petals, setPetals] = useState<Petal[]>([]);
  
  // 產生隨機花瓣的函數
  const generatePetals = () => {
    const petalImages = [
      '/petals/petal1.png',
      '/petals/petal2.png',
      '/petals/petal3.png',
    ];
    
    // 創建20個花瓣，每個具有隨機位置和動畫參數
    const newPetals: Petal[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 10 + 10}s`,
      animationDelay: `${Math.random() * 5}s`,
      image: petalImages[Math.floor(Math.random() * petalImages.length)]
    }));
    
    setPetals(newPetals);
  };
  
  // 組件掛載時產生花瓣
  useEffect(() => {
    generatePetals();
    
    // 每30秒重新產生花瓣，使動畫不會重複
    const interval = setInterval(generatePetals, 30000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {petals.map((petal) => (
        <div
          key={petal.id}
          className="petal"
          style={{
            left: petal.left,
            animation: `fall ${petal.animationDuration} linear ${petal.animationDelay} forwards`,
            top: '-50px',
            width: '30px',
            height: '30px',
            // 由於我們沒有真實的花瓣圖片，使用背景色作為替代
            backgroundColor: '#FFD1DC',
            opacity: '0.6',
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
};

export default FallingPetals; 