"use client";

import type { MascotMood } from "./mascot-assets";

interface NoriSvgAvatarProps {
  mood?: MascotMood;
  size?: number;
  className?: string;
}

export function NoriSvgAvatar({ mood = "default", size = 120, className = "" }: NoriSvgAvatarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
    >
      <defs>
        {/* Body Gradient */}
        <radialGradient id="noriBodyGrad" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#3A3A3A" />
          <stop offset="70%" stopColor="#222222" />
          <stop offset="100%" stopColor="#141414" />
        </radialGradient>

        {/* Neon Glow Filter */}
        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Shadow */}
      <ellipse cx="100" cy="180" rx="60" ry="10" fill="#000000" opacity="0.25" />

      {/* Left Ear */}
      <path d="M 50 65 L 30 20 C 35 15 65 30 65 50 Z" fill="#222222" />
      <path d="M 50 60 L 35 27 C 40 23 60 35 60 48 Z" fill="#39FF14" filter="url(#neonGlow)" opacity="0.9" />

      {/* Right Ear */}
      <path d="M 150 65 L 170 20 C 165 15 135 30 135 50 Z" fill="#222222" />
      <path d="M 150 60 L 165 27 C 160 23 140 35 140 48 Z" fill="#39FF14" filter="url(#neonGlow)" opacity="0.9" />

      {/* Main Body */}
      <circle cx="100" cy="105" r="70" fill="url(#noriBodyGrad)" stroke="#2C2C2C" strokeWidth="2" />

      {/* Feet */}
      <ellipse cx="75" cy="172" rx="14" ry="10" fill="#1A1A1A" />
      <ellipse cx="125" cy="172" rx="14" ry="10" fill="#1A1A1A" />

      {/* Arms */}
      {mood === "happy" || mood === "celebrating" ? (
        <>
          {/* Raised Arm */}
          <path d="M 38 100 Q 20 80 25 70 Q 35 70 45 92 Z" fill="#222222" />
          <path d="M 162 100 Q 180 80 175 70 Q 165 70 155 92 Z" fill="#222222" />
        </>
      ) : mood === "working" ? (
        <>
          {/* Arms holding laptop */}
          <path d="M 40 115 Q 60 130 75 130 Z" fill="#222222" stroke="#1A1A1A" strokeWidth="8" strokeLinecap="round" />
          <path d="M 160 115 Q 140 130 125 130 Z" fill="#222222" stroke="#1A1A1A" strokeWidth="8" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Default Arms */}
          <ellipse cx="34" cy="115" rx="10" ry="16" fill="#222222" transform="rotate(20 34 115)" />
          <ellipse cx="166" cy="115" rx="10" ry="16" fill="#222222" transform="rotate(-20 166 115)" />
        </>
      )}

      {/* Eyes */}
      {mood === "celebrating" ? (
        <>
          {/* Happy Closed Eye Arcs */}
          <path d="M 65 95 Q 80 80 95 95" stroke="#39FF14" strokeWidth="5" strokeLinecap="round" fill="none" filter="url(#neonGlow)" />
          <path d="M 105 95 Q 120 80 135 95" stroke="#39FF14" strokeWidth="5" strokeLinecap="round" fill="none" filter="url(#neonGlow)" />
        </>
      ) : (
        <>
          {/* Left Eye */}
          <ellipse cx="78" cy="92" rx="18" ry="22" fill="#111827" />
          <ellipse cx="78" cy="92" rx="14" ry="18" fill="#39FF14" opacity="0.85" filter="url(#neonGlow)" />
          <ellipse cx="78" cy="92" rx="10" ry="14" fill="#090D16" />
          <circle cx="73" cy="84" r="5" fill="#FFFFFF" />
          <circle cx="83" cy="98" r="2.5" fill="#FFFFFF" />

          {/* Right Eye */}
          <ellipse cx="122" cy="92" rx="18" ry="22" fill="#111827" />
          <ellipse cx="122" cy="92" rx="14" ry="18" fill="#39FF14" opacity="0.85" filter="url(#neonGlow)" />
          <ellipse cx="122" cy="92" rx="10" ry="14" fill="#090D16" />
          <circle cx="117" cy="84" r="5" fill="#FFFFFF" />
          <circle cx="127" cy="98" r="2.5" fill="#FFFFFF" />
        </>
      )}

      {/* Mouth */}
      {mood === "warning" ? (
        <ellipse cx="100" cy="120" rx="6" ry="7" fill="#39FF14" />
      ) : mood === "happy" || mood === "celebrating" ? (
        <path d="M 90 115 Q 100 128 110 115 Z" fill="#39FF14" filter="url(#neonGlow)" />
      ) : (
        <path d="M 92 116 Q 100 123 108 116" stroke="#39FF14" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}

      {/* Chest N. Emblem */}
      <g transform="translate(90, 134)">
        <path
          d="M 2 14 L 2 2 Q 8 8 13 14 L 13 2"
          stroke="#39FF14"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter="url(#neonGlow)"
        />
        <circle cx="18" cy="14" r="2" fill="#39FF14" filter="url(#neonGlow)" />
      </g>

      {/* Contextual Mood Props */}
      {mood === "working" && (
        <g transform="translate(65, 122)">
          {/* Laptop Base */}
          <rect x="0" y="18" width="70" height="6" rx="3" fill="#A7B3A1" />
          {/* Laptop Screen */}
          <rect x="10" y="0" width="50" height="20" rx="3" fill="#2C2C2C" stroke="#A7B3A1" strokeWidth="1.5" />
          {/* Screen N. Logo */}
          <path d="M 30 14 L 30 6 L 38 14 L 38 6" stroke="#39FF14" strokeWidth="1.5" fill="none" />
        </g>
      )}

      {mood === "thinking" && (
        <g transform="translate(145, 45)">
          <path d="M 10 0 L 12 6 L 18 8 L 12 10 L 10 16 L 8 10 L 2 8 L 8 6 Z" fill="#39FF14" filter="url(#neonGlow)" />
          <path d="M -5 20 L -4 23 L -1 24 L -4 25 L -5 28 L -6 25 L -9 24 L -6 23 Z" fill="#39FF14" opacity="0.7" />
        </g>
      )}

      {mood === "warning" && (
        <g transform="translate(145, 55)">
          <path d="M 12 0 L 24 20 L 0 20 Z" fill="#EF4444" />
          <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="bold">!</text>
        </g>
      )}
    </svg>
  );
}
