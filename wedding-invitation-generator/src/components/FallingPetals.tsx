/**
 * Falling Petals Animation Component
 * 
 * This component creates an aesthetic background animation of falling petals.
 * It uses React hooks to manage petal state and lifecycle, and CSS animations
 * for the actual falling motion effect.
 * 
 * Key features:
 * - Randomly positioned petals across the screen
 * - Varied animation durations and delays for a natural effect
 * - Periodic regeneration to maintain the animation
 */
import React, { useState, useEffect } from 'react';
import { Petal } from '../types';

/**
 * FallingPetals Component
 * 
 * Creates multiple petal elements with different animation parameters 
 * to create a decorative falling effect across the page
 * 
 * @returns {JSX.Element} A fixed position div containing animated petals
 */
const FallingPetals: React.FC = () => {
  // State to store the collection of petals with their animation properties
  const [petals, setPetals] = useState<Petal[]>([]);
  
  /**
   * Generate randomized petal elements
   * Creates an array of petal objects with randomized properties
   * for position, animation timing, and appearance
   */
  const generatePetals = () => {
    // Paths to different petal image assets
    const petalImages = [
      '/petals/petal1.png',
      '/petals/petal2.png',
      '/petals/petal3.png',
    ];
    
    // Create 20 petals with randomized properties
    const newPetals: Petal[] = Array.from({ length: 20 }, (_, i) => ({
      id: i, // Unique identifier for React's key prop
      left: `${Math.random() * 100}%`, // Random horizontal position
      animationDuration: `${Math.random() * 10 + 10}s`, // Random duration between 10-20s
      animationDelay: `${Math.random() * 5}s`, // Random delay before animation begins
      image: petalImages[Math.floor(Math.random() * petalImages.length)] // Random petal image
    }));
    
    setPetals(newPetals);
  };
  
  /**
   * Effect hook to initialize and periodically refresh petals
   * Runs once on component mount and sets up an interval to regenerate
   * petals every 30 seconds to maintain visual interest
   */
  useEffect(() => {
    // Initial generation of petals
    generatePetals();
    
    // Set interval to regenerate petals every 30 seconds
    // This prevents the animation from becoming predictable
    const interval = setInterval(generatePetals, 30000);
    
    // Cleanup function to clear the interval when component unmounts
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {petals.map((petal) => (
        <div
          key={petal.id}
          className="petal"
          style={{
            left: petal.left, // Horizontal position
            animation: `fall ${petal.animationDuration} linear ${petal.animationDelay} forwards`, // CSS animation
            top: '-50px', // Start above the viewport
            width: '30px',
            height: '30px',
            // Use background color as fallback when actual petal images aren't available
            backgroundColor: '#FFD1DC', // Light pink color
            opacity: '0.6',
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%', // Organic petal-like shape
            transform: `rotate(${Math.random() * 360}deg)`, // Random rotation
          }}
        />
      ))}
    </div>
  );
};

export default FallingPetals; 