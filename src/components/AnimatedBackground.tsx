import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

export function AnimatedBackground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Subtle Technical Dot Grid Matrix */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isDark ? 'opacity-[0.18]' : 'opacity-[0.12]'
        }`}
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(rgba(0, 229, 255, 0.35) 1px, transparent 1px)'
            : 'radial-gradient(rgba(13, 92, 99, 0.3) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Kinetic Aurora Blob 1: Laser Aqua (Top-Left) */}
      <motion.div
        animate={{
          x: [0, 45, -30, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full blur-[130px] transition-all duration-1000 ${
          isDark
            ? 'bg-gradient-to-br from-[#00e5ff]/25 to-[#0d5c63]/20'
            : 'bg-gradient-to-br from-[#5ef0ff]/30 to-[#e0f4f8]/50'
        }`}
        style={{ willChange: 'transform' }}
      />

      {/* Kinetic Aurora Blob 2: Deep Ocean Teal (Bottom-Right) */}
      <motion.div
        animate={{
          x: [0, -50, 40, 0],
          y: [0, 35, -25, 0],
          scale: [1, 1.1, 0.92, 1],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[140px] transition-all duration-1000 ${
          isDark
            ? 'bg-gradient-to-tl from-[#0a4a50]/30 to-[#00e5ff]/15'
            : 'bg-gradient-to-tl from-[#cfeaf0]/40 to-[#0d5c63]/10'
        }`}
        style={{ willChange: 'transform' }}
      />

      {/* Kinetic Aurora Blob 3: Renewable Green/Cyan Accent (Center Drift) */}
      <motion.div
        animate={{
          x: [0, 30, -45, 0],
          y: [0, 50, -30, 0],
          scale: [0.95, 1.08, 1, 0.95],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full blur-[150px] transition-all duration-1000 ${
          isDark
            ? 'bg-gradient-to-tr from-[#10b981]/15 via-[#00e5ff]/10 to-transparent'
            : 'bg-gradient-to-tr from-[#a7f3d0]/25 via-[#bae6fd]/20 to-transparent'
        }`}
        style={{ willChange: 'transform' }}
      />

      {/* Ambient Vignette Overlay */}
      <div
        className={`absolute inset-0 transition-colors duration-1000 ${
          isDark
            ? 'bg-gradient-to-b from-transparent via-[#060f1c]/30 to-[#060f1c]/70'
            : 'bg-gradient-to-b from-transparent via-white/20 to-white/60'
        }`}
      />
    </div>
  );
}
