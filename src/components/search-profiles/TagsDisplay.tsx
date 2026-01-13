import React from 'react';

interface TagsDisplayProps {
  items: string[];
  onRemove: (item: string) => void;
}

export function TagsDisplay({ items, onRemove }: TagsDisplayProps) {
  if (items.length === 0) return null;
  
  return (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '6px', 
      marginBottom: '10px',
      padding: '8px',
      background: 'var(--success-light)',
      borderRadius: '6px',
      border: '1px solid var(--success)'
    }}>
      {items.map((item, idx) => (
        <span key={idx} style={{ 
          background: 'var(--success)', 
          color: '#fff', 
          padding: '4px 10px', 
          borderRadius: '15px', 
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {item}
          <button 
            onClick={() => onRemove(item)} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#fff', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              padding: '0 2px',
              fontSize: '12px'
            }}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
