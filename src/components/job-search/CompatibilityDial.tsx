import React, { useState } from 'react';

interface CompatibilityDialProps {
  score: number | null | undefined;
  size?: 'small' | 'large';
  source?: string; // Which profile source was used for assessment
  missingSkills?: string[]; // Missing qualifications
  matchedSkills?: string[]; // Matched qualifications
  breakdown?: {
    skills: number;
    experience: number;
    education: number;
    location: number;
  };
}

export function CompatibilityDial({ score, size = 'small', source, missingSkills = [], matchedSkills = [], breakdown }: CompatibilityDialProps) {
  const [showTooltip, setShowTooltip] = useState(false);
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

  // Build tooltip content
  const getTooltipContent = () => {
    const lines: string[] = [];
    
    // Score info
    lines.push(`Match Score: ${score}% (${label})`);
    
    // Breakdown if available
    if (breakdown) {
      lines.push('');
      lines.push('📊 Score Breakdown:');
      lines.push(`  • Skills: ${breakdown.skills}%`);
      lines.push(`  • Experience: ${breakdown.experience}%`);
      lines.push(`  • Education: ${breakdown.education}%`);
      lines.push(`  • Location: ${breakdown.location}%`);
    }
    
    // Missing skills
    if (missingSkills && missingSkills.length > 0) {
      lines.push('');
      lines.push('❌ Missing Qualifications:');
      missingSkills.slice(0, 5).forEach(skill => {
        lines.push(`  • ${skill}`);
      });
      if (missingSkills.length > 5) {
        lines.push(`  ... and ${missingSkills.length - 5} more`);
      }
    }
    
    // Matched skills
    if (matchedSkills && matchedSkills.length > 0) {
      lines.push('');
      lines.push('✅ Matched Skills:');
      matchedSkills.slice(0, 5).forEach(skill => {
        lines.push(`  • ${skill}`);
      });
      if (matchedSkills.length > 5) {
        lines.push(`  ... and ${matchedSkills.length - 5} more`);
      }
    }
    
    // Source
    if (source) {
      lines.push('');
      lines.push(`📋 Based on: ${source}`);
    }
    
    return lines.join('\n');
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '4px',
        minWidth: size === 'large' ? '50px' : '35px',
        position: 'relative'
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Hover Tooltip */}
      {showTooltip && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          padding: '12px',
          background: 'var(--card-bg, #fff)',
          border: `2px solid ${color}`,
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 1000,
          minWidth: '220px',
          maxWidth: '300px',
          whiteSpace: 'pre-line',
          fontSize: '11px',
          lineHeight: '1.4',
          color: 'var(--text-primary, #333)',
          pointerEvents: 'none'
        }}>
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `8px solid ${color}`
          }} />
          
          {/* Header with color indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border, #eee)'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: bg
            }} />
            <span style={{ fontWeight: 'bold', fontSize: '12px', color }}>
              {score}% - {label} Match
            </span>
          </div>
          
          {/* Breakdown section */}
          {breakdown && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-secondary, #666)' }}>
                📊 Score Breakdown:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '10px' }}>
                <span>Skills: {breakdown.skills}%</span>
                <span>Experience: {breakdown.experience}%</span>
                <span>Education: {breakdown.education}%</span>
                <span>Location: {breakdown.location}%</span>
              </div>
            </div>
          )}
          
          {/* Missing skills section */}
          {missingSkills && missingSkills.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#f44336' }}>
                ❌ Missing Qualifications:
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', color: '#f44336' }}>
                {missingSkills.slice(0, 5).map((skill, i) => (
                  <li key={i} style={{ marginBottom: '2px' }}>{skill}</li>
                ))}
                {missingSkills.length > 5 && (
                  <li style={{ fontStyle: 'italic', opacity: 0.8 }}>
                    ...and {missingSkills.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {/* Matched skills section */}
          {matchedSkills && matchedSkills.length > 0 && (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#4CAF50' }}>
                ✅ Matched Skills:
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', color: '#4CAF50' }}>
                {matchedSkills.slice(0, 3).map((skill, i) => (
                  <li key={i} style={{ marginBottom: '2px' }}>{skill}</li>
                ))}
                {matchedSkills.length > 3 && (
                  <li style={{ fontStyle: 'italic', opacity: 0.8 }}>
                    ...and {matchedSkills.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {/* Source info */}
          {source && (
            <div style={{ 
              marginTop: '8px', 
              paddingTop: '8px', 
              borderTop: '1px solid var(--border, #eee)',
              fontSize: '10px',
              color: 'var(--text-tertiary, #888)'
            }}>
              📋 Based on: {source}
            </div>
          )}
        </div>
      )}
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
      
      {/* Source indicator (only for large size) */}
      {size === 'large' && source && (
        <span style={{ 
          fontSize: '8px', 
          color: 'var(--text-tertiary)',
          maxWidth: '60px',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {source.replace('All Sources (Combined)', 'All').replace(' Profile', '').replace('Uploaded CV: ', '📄')}
        </span>
      )}
    </div>
  );
}
