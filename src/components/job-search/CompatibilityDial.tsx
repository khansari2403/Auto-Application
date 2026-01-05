import React from 'react';

interface CompatibilityDialProps {
  score: number | null | undefined;
  size?: 'small' | 'large';
  source?: string; // Which profile source was used for assessment
}

export function CompatibilityDial({ score, size = 'small', source }: CompatibilityDialProps) {
  // If no score, show N/A
  if (score === null || score === undefined || score === 0) {
    const height = size === 'large' ? 80 : 40;
    const width = size === 'large' ? 20 : 12;
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '4px',
        minWidth: size === 'large' ? '50px' : '35px'
      }}>
        <div style={{ 
          position: 'relative',
          width: `${width}px`, 
          height: `${height}px`, 
          borderRadius: `${width/2}px`,
          background: 'var(--bg-tertiary)',
          border: '1px dashed var(--border)',
          overflow: 'hidden'
        }} />
        <span style={{ 
          fontSize: size === 'large' ? '11px' : '9px', 
          fontWeight: 'bold',
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase'
        }}>
          N/A
        </span>
      </div>
    );
  }

  // score: 0-100, maps to red (0-25), yellow (26-50), green (51-75), gold (76-100)
  const getColor = (s: number) => {
    if (s >= 76) return { color: '#FFD700', label: 'Gold', bg: 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)' };
    if (s >= 51) return { color: '#4CAF50', label: 'Green', bg: 'linear-gradient(180deg, #4CAF50 0%, #2E7D32 100%)' };
    if (s >= 26) return { color: '#FFC107', label: 'Yellow', bg: 'linear-gradient(180deg, #FFC107 0%, #FF9800 100%)' };
    return { color: '#f44336', label: 'Red', bg: 'linear-gradient(180deg, #f44336 0%, #c62828 100%)' };
  };

  const { color, label, bg } = getColor(score);
  const height = size === 'large' ? 80 : 40;
  const width = size === 'large' ? 20 : 12;
  const fillHeight = (score / 100) * height;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '4px',
      minWidth: size === 'large' ? '50px' : '35px'
    }}>
      {/* Vertical Gauge */}
      <div style={{ 
        position: 'relative',
        width: `${width}px`, 
        height: `${height}px`, 
        borderRadius: `${width/2}px`,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* Fill */}
        <div style={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${fillHeight}px`,
          background: bg,
          borderRadius: `0 0 ${width/2}px ${width/2}px`,
          transition: 'height 0.5s ease'
        }} />
        
        {/* Color markers on the side */}
        <div style={{ position: 'absolute', right: '-3px', top: '0', width: '3px', height: '25%', background: '#FFD700', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', right: '-3px', top: '25%', width: '3px', height: '25%', background: '#4CAF50', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', right: '-3px', top: '50%', width: '3px', height: '25%', background: '#FFC107', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', right: '-3px', top: '75%', width: '3px', height: '25%', background: '#f44336', borderRadius: '2px' }} />
      </div>
      
      {/* Label */}
      <span style={{ 
        fontSize: size === 'large' ? '11px' : '9px', 
        fontWeight: 'bold',
        color: color,
        textTransform: 'uppercase'
      }}>
        {label}
      </span>
    </div>
  );
}
