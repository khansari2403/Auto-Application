import { useState, useEffect } from 'react';

export function SearchProfiles({ userId }: { userId: number }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [newName, setNewName] = useState('');

  const loadProfiles = async () => {
    const result = await (window as any).electron.invoke('profiles:get-all', userId);
    if (result?.success) setProfiles(result.data);
  };

  useEffect(() => { loadProfiles(); }, [userId]);

  const handleSave = async () => {
    await (window as any).electron.invoke('profiles:update', editing);
    setEditing(null);
    loadProfiles();
    alert("Search Profile Saved!");
  };

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px' };
  const labelStyle = { display: 'block', fontWeight: 'bold', marginBottom: '4px', color: '#0077b5', fontSize: '12px' };
  const groupStyle = { background: '#f9f9f9', padding: '15px', borderRadius: '10px', marginBottom: '15px', border: '1px solid #eee' };

  const DropdownWithOther = ({ label, field, options }: any) => {
    const val = editing[field] || 'Any';
    const isOther = val !== 'Any' && !options.includes(val);
    return (
      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>{label}</label>
        <select style={inputStyle} value={isOther ? 'Other' : val} onChange={e => setEditing({...editing, [field]: e.target.value === 'Other' ? '' : e.target.value})}>
          <option value="Any">Any</option>
          {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
          <option value="Other">Other...</option>
        </select>
        {isOther && <input style={{ ...inputStyle, borderColor: '#ff9800' }} value={val} onChange={e => setEditing({...editing, [field]: e.target.value})} />}
      </div>
    );
  };

  if (editing) {
    return (
      <div style={{ padding: '20px', background: '#fff' }}>
        <h3>⚙️ {editing.is_speculative ? '🚀 Speculative Application Settings' : `Criteria: ${editing.profile_name}`}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <div style={groupStyle}>
              <h4>📍 Core Details</h4>
              <label style={labelStyle}>1. Location</label>
              <input style={inputStyle} value={editing.location || 'Any'} onChange={e => setEditing({...editing, location: e.target.value})} />
              <DropdownWithOther label="2. Industry" field="industry" options={['Tech/IT', 'Healthcare', 'Finance', 'Education', 'Manufacturing']} />
              <DropdownWithOther label="3. Job Type" field="job_type" options={['Full-Time', 'Part-Time', 'Internship', 'Freelance', 'Contract']} />
              <DropdownWithOther label="4. Experience Level" field="experience_level" options={['Entry-Level', 'Mid-Level', 'Senior', 'Expert']} />
              <DropdownWithOther label="5. Salary Range" field="salary_range" options={['Below Average', 'Average', 'Above Average', 'Negotiable']} />
            </div>
          </div>
          <div>
            <div style={groupStyle}>
              <h4>🛠️ Skills & Education</h4>
              <label style={labelStyle}>8. Required Skills</label>
              <textarea style={{ ...inputStyle, height: '60px' }} value={editing.required_skills || 'Any'} onChange={e => setEditing({...editing, required_skills: e.target.value})} />
              <DropdownWithOther label="9. Education Level" field="education_level" options={['High School', "Bachelor's", "Master's", 'PhD', 'Vocational', 'Ausbildung', 'Magister']} />
              <DropdownWithOther label="19. Certifications" field="certifications" options={['PMP', 'CPA', 'CFA', 'Nursing', 'Teaching']} />
            </div>
          </div>
        </div>
        <button onClick={handleSave} style={{ padding: '10px 30px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px' }}>✅ Save Profile</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>🔍 Search Profiles</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New Profile Name..." style={{ padding: '10px' }} />
        <button onClick={async () => { await (window as any).electron.invoke('profiles:save', { userId, profileName: newName, is_active: 1 }); setNewName(''); loadProfiles(); }} style={{ padding: '10px 20px', background: '#0077b5', color: '#fff', border: 'none' }}>+ Create</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
        {profiles.map(p => (
          <div key={p.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '10px', background: p.is_speculative ? '#fffde7' : '#fff' }}>
            <div style={{ fontWeight: 'bold' }}>{p.profile_name} {p.is_speculative && '🚀'}</div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
              <button onClick={() => setEditing(p)} style={{ flex: 1 }}>⚙️ Set</button>
              <button onClick={async () => { await (window as any).electron.invoke('profiles:update', { ...p, is_active: p.is_active ? 0 : 1 }); loadProfiles(); }} style={{ background: p.is_active ? '#f44336' : '#4CAF50', color: '#fff' }}>{p.is_active ? 'Off' : 'On'}</button>
              {!p.is_speculative && <button onClick={async () => { if(confirm("Delete?")) { await (window as any).electron.invoke('profiles:delete', p.id); loadProfiles(); } }}>🗑️</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}