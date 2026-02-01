
import React, { useState } from 'react';

export const LanguageInput = ({ value, onChange }) => {
  // Parse initial value: "English (Native), German (B2)" -> [{language: "English", level: "Native"}, ...]
  // Or handle empty string
  const parseLanguages = (str) => {
    if (!str) return [];
    // Check if it's JSON array
    try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed) && typeof parsed[0] === 'object') return parsed;
    } catch {}
    
    // Fallback: parse string format
    return str.split(',').map(s => {
      const match = s.trim().match(/^(.*?)\s*\((.*?)\)$/);
      if (match) return { language: match[1], level: match[2] };
      return { language: s.trim(), level: 'Proficient' };
    }).filter(x => x.language);
  };

  const [languages, setLanguages] = useState(parseLanguages(value));

  const updateParent = (newLangs) => {
    // Save as JSON string to maintain structure in the DB field (which expects string)
    // Or save as human readable string? The prompt says "level proficiency must be ... brought in the CV".
    // If I save as JSON, the existing `doc-generator` might break if it expects a comma-separated string.
    // However, I can update `doc-generator` to handle JSON.
    // BUT `SettingsPanel` treats it as a string input currently.
    // Strategy: Store as JSON string in the `languages` field.
    // Backward compatibility: The `doc-generator` needs to check if it's JSON or CSV.
    onChange(JSON.stringify(newLangs));
  };

  const addLanguage = () => {
    const n = [...languages, { language: '', level: 'Native' }];
    setLanguages(n);
    updateParent(n);
  };

  const removeLanguage = (idx) => {
    const n = languages.filter((_, i) => i !== idx);
    setLanguages(n);
    updateParent(n);
  };

  const updateLanguage = (idx, field, val) => {
    const n = [...languages];
    n[idx][field] = val;
    setLanguages(n);
    updateParent(n);
  };

  const levels = ["Native", "Fluent", "C2", "C1", "B2", "B1", "A2", "A1"];

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
         <label style={{fontWeight: 600, fontSize: '12px'}}>Languages</label>
         <button onClick={addLanguage} style={{fontSize: '11px', padding: '2px 8px'}}>+ Add</button>
      </div>
      {languages.map((l, i) => (
        <div key={i} style={{display: 'flex', gap: '5px', marginBottom: '5px'}}>
          <input 
            style={{flex: 1, padding: '5px', border: '1px solid #ddd', borderRadius: '4px'}} 
            value={l.language} 
            onChange={(e) => updateLanguage(i, 'language', e.target.value)}
            placeholder="Language"
          />
          <select 
            style={{width: '100px', padding: '5px', border: '1px solid #ddd', borderRadius: '4px'}}
            value={l.level}
            onChange={(e) => updateLanguage(i, 'level', e.target.value)}
          >
            {levels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
          </select>
          <button onClick={() => removeLanguage(i)} style={{background: 'none', border: 'none', cursor: 'pointer'}}>❌</button>
        </div>
      ))}
    </div>
  );
};
