import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

interface TiltedCardProps {
  imageSrc?: string;
  altText?: string;
  captionText?: string;
  containerHeight?: string;
  containerWidth?: string;
  imageHeight?: string;
  imageWidth?: string;
  rotateAmplitude?: number;
  scaleOnHover?: number;
  showMobileWarning?: boolean;
  showTooltip?: boolean;
  displayOverlayContent?: boolean;
  overlayContent?: React.ReactNode;
  className?: string;
}

export default function TiltedCard({
  imageSrc,
  altText = "Tilted Card",
  captionText,
  containerHeight = "280px",
  containerWidth = "100%",
  imageHeight = "100%",
  imageWidth = "100%",
  rotateAmplitude = 12,
  scaleOnHover = 1.05,
  showMobileWarning = false,
  showTooltip = false,
  displayOverlayContent = false,
  overlayContent,
  className = ""
}: TiltedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 300, damping: 30 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotY = (offsetX / (rect.width / 2)) * rotateAmplitude;

    x.set(rotY);
    y.set(rotX);
  }

  function handleMouseEnter() {
    setIsHovered(true);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative cursor-pointer perspective-1000 select-none ${className}`}
      style={{
        height: containerHeight,
        width: containerWidth,
      }}
    >
      <motion.div
        className="w-full h-full relative rounded-3xl overflow-hidden shadow-lg border border-subtle bg-surface flex flex-col items-center justify-center p-0 text-center"
        style={{
          rotateX: mouseY,
          rotateY: mouseX,
          transformStyle: "preserve-3d",
        }}
        animate={{
          scale: isHovered ? scaleOnHover : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
        }}
      >
        {imageSrc && !displayOverlayContent && (
          <img
            src={imageSrc}
            alt={altText}
            className="w-full h-full object-cover transition-transform duration-300"
            style={{
              height: imageHeight,
              width: imageWidth,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(altText)}&backgroundColor=121420&textColor=4ce0b3`;
            }}
          />
        )}

        {displayOverlayContent && overlayContent && (
          <div
            className="w-full h-full flex flex-col items-center justify-center z-10"
            style={{ transform: "translateZ(30px)" }}
          >
            {overlayContent}
          </div>
        )}
      </motion.div>

      {showTooltip && captionText && isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-surface border border-subtle text-primary text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap z-20 pointer-events-none"
        >
          {captionText}
        </motion.div>
      )}
    </div>
  );
}
