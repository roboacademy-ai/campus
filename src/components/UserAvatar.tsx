import React from 'react';

interface UserAvatarProps {
  className?: string;
}

export function UserAvatar({ className = 'w-full h-full text-slate-850' }: UserAvatarProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      id="svg-user-outline-avatar"
    >
      {/* Hair outline & volume */}
      <path d="M34 46 C34 26, 52 18, 82 26 C88 30, 86 46, 86 46" fill="white" stroke="currentColor" />
      <path d="M34 40 C38 28, 58 23, 82 30" stroke="currentColor" />
      <path d="M50 22 C60 26, 70 32, 78 42" stroke="currentColor" />
      
      {/* Face outline */}
      <path d="M40 46 C40 64, 80 64, 80 46" fill="white" stroke="currentColor" />
      
      {/* Left and Right Ears */}
      <path d="M36 44 C33 44, 33 50, 36 50" stroke="currentColor" />
      <path d="M84 44 C87 44, 87 50, 84 50" stroke="currentColor" />
      
      {/* Neck */}
      <path d="M53 60 L53 72" stroke="currentColor" />
      <path d="M67 60 L67 72" stroke="currentColor" />
      
      {/* Shoulder outlines */}
      <path d="M22 96 C22 81, 38 78, 47 74" stroke="currentColor" />
      <path d="M98 96 C98 81, 82 78, 73 74" stroke="currentColor" />
      
      {/* Shirt Collar folds */}
      <path d="M47 74 L60 83 L73 74" fill="white" stroke="currentColor" />
      <path d="M47 74 L53 72" stroke="currentColor" />
      <path d="M73 74 L67 72" stroke="currentColor" />
      
      {/* Tie */}
      <path d="M57 83 H63 L65 106 L60 114 L55 106 Z" fill="currentColor" stroke="currentColor" />
    </svg>
  );
}
