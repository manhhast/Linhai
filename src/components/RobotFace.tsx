import React from 'react';

export type Expression = 'neutral' | 'happy' | 'thinking' | 'surprised' | 'sad';

interface RobotFaceProps {
  expression: Expression;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isSpeaking?: boolean;
}

export const RobotFace: React.FC<RobotFaceProps> = ({ 
  expression = 'neutral', 
  size = 'md', 
  className = '',
  isSpeaking = false 
}) => {
  const dimensions = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-24 h-24'
  };

  const getEyePath = (side: 'left' | 'right') => {
    const safeExpression = expression || 'neutral';
    switch (safeExpression) {
      case 'happy':
        return side === 'left' ? "M 30 45 Q 35 40 40 45" : "M 60 45 Q 65 40 70 45";
      case 'sad':
        return side === 'left' ? "M 30 48 Q 35 43 40 48" : "M 60 48 Q 65 43 70 48";
      case 'surprised':
        return side === 'left' ? "M 35 45 A 5 5 0 1 1 35 45.1" : "M 65 45 A 5 5 0 1 1 65 45.1";
      case 'thinking':
        return side === 'left' ? "M 30 45 L 40 45" : "M 60 42 L 70 42";
      default:
        return side === 'left' ? "M 30 45 L 40 45" : "M 60 45 L 70 45";
    }
  };

  const getMouthPath = () => {
    if (isSpeaking) {
      return "M 40 75 Q 50 80 60 75"; // Slightly open
    }
    const safeExpression = expression || 'neutral';
    switch (safeExpression) {
      case 'happy':
        return "M 35 70 Q 50 85 65 70";
      case 'sad':
        return "M 35 75 Q 50 65 65 75";
      case 'surprised':
        return "M 45 75 A 5 5 0 1 1 45 75.1";
      case 'thinking':
        return "M 40 75 L 60 75";
      default:
        return "M 40 75 Q 50 75 60 75";
    }
  };

  const isThinking = expression === 'thinking';

  return (
    <div className={`${dimensions[size]} ${className} relative flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
        {/* Head */}
        <rect
          x="10" y="10" width="80" height="80" rx="20"
          fill="currentColor"
          className={`text-primary/20 transition-all duration-300 ${isThinking ? 'animate-bounce' : ''} ${isSpeaking ? 'animate-pulse' : ''}`}
          stroke="currentColor"
          strokeWidth="2"
        />
        
        {/* Screen Background */}
        <rect x="20" y="25" width="60" height="55" rx="10" fill="#0a0a0a" />

        {/* Eyes */}
        <path
          d={getEyePath('left')}
          stroke="var(--primary)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          className={`transition-all duration-300 ${isSpeaking ? 'animate-[pulse_0.5s_infinite]' : ''}`}
        />
        <path
          d={getEyePath('right')}
          stroke="var(--primary)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          className={`transition-all duration-300 ${isSpeaking ? 'animate-[pulse_0.5s_infinite]' : ''}`}
        />

        {/* Mouth */}
        <path
          d={getMouthPath()}
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          className={`transition-all duration-300 ${isSpeaking ? 'animate-bounce' : ''}`}
        />

        {/* Antenna */}
        <line
          x1="50" y1="10" x2="50" y2="0"
          stroke="currentColor"
          strokeWidth="2"
          className={isThinking ? 'animate-pulse' : ''}
        />
        <circle
          cx="50" cy="0" r="3"
          fill="var(--primary)"
          className={isThinking ? 'animate-pulse' : ''}
        />
      </svg>
    </div>
  );
};
