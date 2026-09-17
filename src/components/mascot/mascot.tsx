"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MascotAssets, type MascotMood } from "./mascot-assets";
import { NoriSvgAvatar } from "./nori-svg-avatar";
import { MascotBubble } from "./mascot-bubble";

export interface MascotProps {
  mood?: MascotMood;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  message?: string | React.ReactNode;
  bubblePosition?: "top" | "bottom" | "left" | "right";
  animate?: boolean;
  className?: string;
  onClick?: () => void;
  usePng?: boolean;
}

const SIZE_MAP = {
  xs: 40,
  sm: 64,
  md: 96,
  lg: 128,
  xl: 180,
};

export function Mascot({
  mood = "default",
  size = "md",
  message,
  bubblePosition = "top",
  animate = true,
  className = "",
  onClick,
}: MascotProps) {
  const [imgError, setImgError] = useState(false);
  const assetConfig = MascotAssets.getAsset(mood);
  const numericSize = typeof size === "number" ? size : SIZE_MAP[size] || 96;

  const displayMessage = message ?? (mood !== "default" ? assetConfig.defaultMessage : undefined);

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center ${
        onClick ? "cursor-pointer group" : ""
      } ${className}`}
      onClick={onClick}
    >
      {/* Speech Bubble */}
      {displayMessage && (
        <MascotBubble position={bubblePosition}>
          {displayMessage}
        </MascotBubble>
      )}

      {/* Animated Nori Avatar Wrapper */}
      <motion.div
        animate={
          animate
            ? {
                y: [0, -5, 0],
                rotate: mood === "happy" || mood === "celebrating" ? [0, 2, -2, 0] : 0,
              }
            : {}
        }
        transition={{
          duration: mood === "thinking" || mood === "working" ? 2.5 : 4,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center justify-center"
      >
        {!imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/mascot/nori.jpg"
            alt="Nori Mascot"
            width={numericSize}
            height={numericSize}
            onError={() => setImgError(true)}
            className="object-contain rounded-2xl drop-shadow-lg transition-all duration-300"
            style={{ width: numericSize, height: numericSize }}
          />
        ) : (
          <NoriSvgAvatar mood={mood} size={numericSize} />
        )}
      </motion.div>
    </div>
  );
}
