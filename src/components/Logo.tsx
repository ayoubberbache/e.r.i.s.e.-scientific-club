import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

type LogoVariant = 'icon' | 'full';

export function Logo({
  className,
  variant = 'full',
}: {
  className?: string;
  variant?: LogoVariant;
}) {
  const { theme } = useTheme();

  // Light mode = dark teal E + text
  // Dark mode = cyan E + text
  const logoSrc = (theme === 'dark' 
    ? `${import.meta.env.BASE_URL}logo-cyan-full.png` 
    : `${import.meta.env.BASE_URL}logo-teal-full.png`);

  // Uses CSS variable --logo-color (inverted per theme)
  const colorStyle = { color: 'var(--logo-color)' };

  if (variant === 'icon') {
    return (
      <span className="inline-flex items-center justify-center" style={colorStyle} aria-hidden>
        <img src={logoSrc} alt="RISE Logo" className={`object-contain ${className || 'h-10 w-auto'}`.trim()} />
      </span>
    );
  }

  // Full logo (the image now includes both E + "RISE." text)
  return (
    <span
      className="inline-flex items-center justify-center gap-2"
      style={colorStyle}
      aria-hidden
    >
      <img src={logoSrc} alt="RISE Logo" className={`object-contain shrink-0 ${className || 'h-10 sm:h-12 md:h-14 lg:h-16 w-auto min-h-10'}`.trim()} />
    </span>
  );
}