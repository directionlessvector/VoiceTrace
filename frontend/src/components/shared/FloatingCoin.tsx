import React from 'react';

export const FloatingCoin = ({ 
  className, 
  delay = 0, 
  rotation = -15,
  shadowX = 0.05,
  shadowY = 0.12,
}: { 
  className?: string; 
  delay?: number; 
  rotation?: number; 
  shadowX?: number;
  shadowY?: number;
}) => {
  return (
    <div 
      className={`absolute pointer-events-auto z-0 ${className}`}
      style={{
        animation: `float-coin 4s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        width: '1em',
        height: '1em',
      }}
    >
      <div className="w-full h-full" style={{ transform: `rotate(${rotation}deg) scaleY(0.85)` }}>
        <div 
          className="coin-wobble relative w-full h-full rounded-[50%] bg-[#4ade80] flex items-center justify-center cursor-pointer transition-all duration-300"
          style={{
            border: 'calc(0.04em + 1px) solid #222',
            boxShadow: `${shadowX}em ${shadowY}em 0px #222`
          }}
        >
          {/* Inner details to give it that minted look */}
          <div 
            className="absolute inset-[8%] rounded-[50%] opacity-40 mix-blend-multiply"
            style={{ border: 'calc(0.02em + 1px) solid #166534' }}
          />
          {/* Highlights */}
          <div className="absolute top-[10%] left-[20%] w-[20%] h-[10%] bg-white/40 rounded-[50%] blur-[1px] rotate-[-20deg]" />
          <span className="text-[#222] font-black leading-none drop-shadow-[2px_2px_0px_rgba(255,255,255,0.5)] z-10" style={{ fontSize: `0.5em` }}>
            ₹
          </span>
        </div>
      </div>
    </div>
  );
};
