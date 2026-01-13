import React from 'react';

interface ScrollableMultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  maxHeight?: string;
}

export function ScrollableMultiSelect({ 
  label, 
  options, 
  selected, 
  setSelected, 
  maxHeight = '120px' 
}: ScrollableMultiSelectProps) {
  const labelStyle: React.CSSProperties = { 
    display: 'block', 
    marginBottom: '5px', 
    fontSize: '11px', 
    fontWeight: 600, 
    color: 'var(--text-primary)' 
  };

  const toggleSelection = (item: string) => {
    setSelected(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item) 
        : [...prev, item]
    );
  };

  return (
    <div style={{ marginBottom: '10px' }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ 
        maxHeight, 
        overflowY: 'auto', 
        padding: '8px', 
        border: '1px solid var(--border)', 
        borderRadius: '6px', 
        background: 'var(--card-bg)' 
      }}>
        {options.map((opt: string) => (
          <label key={opt} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '4px 0', 
            cursor: 'pointer',
            fontSize: '11px',
            borderBottom: '1px solid var(--border-light)',
            color: 'var(--text-primary)'
          }}>
            <input 
              type="checkbox" 
              checked={selected.includes(opt)} 
              onChange={() => toggleSelection(opt)}
              style={{ cursor: 'pointer' }}
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}
