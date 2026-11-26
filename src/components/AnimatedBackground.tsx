import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Clean Minimal Engineering Grid Background
 * Zero neon glow blobs or glassmorphism — adheres strictly to E.R.I.S.E. surface tokens.
 */
export function AnimatedBackground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none select-none overflow-hidden transition-colors duration-200"
      style={{
        backgroundColor: isDark ? '#060f1c' : '#f8fcfd',
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(rgba(0, 229, 255, 0.08) 1px, transparent 1px)'
            : 'radial-gradient(rgba(13, 92, 99, 0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
    </div>
  );
}
