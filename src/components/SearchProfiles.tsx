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
        <select 
          style={inputStyle} 
          value={isOther ? 'Other' : val} 
          onChange={e => setEditing({...editing, [field]: e.target.value === 'Other' ? '' : e.target.value})}
        >
          <option value="Any">Any</option>
          {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
          <option value="Other">Other (Type below)...</option>
        </select>
        {(isOther || editing[field] === '') && editing[field] !== 'Any' && (
          <input 
            style={{ ...inputStyle, borderColor: '#ff9800' }} 
            value={val === 'Other' ? '' : val} 
            onChange={e => setEditing({...editing, [field]: e.target.value})} 
            placeholder="Type custom value (e.g. Ausbildung, Magister)..."
          />
        )}
      </div>
    );
  };

  if (editing) {
    return (
      <div style={{ padding: '20px', background: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>⚙️ {editing.is_speculative ? '🚀 Speculative Application Settings' : `Criteria: ${editing.profile_name}`}</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setEditing(null)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} style={{ padding: '10px 30px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>✅ Save Profile</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* COLUMN 1 */}
          <div>
            <div style={groupStyle}>
              <h4>📍 1-5. Core Job Details</h4>
              <label style={labelStyle}>1. Location</label>
              <input style={inputStyle} value={editing.location || 'Any'} onChange={e => setEditing({...editing, location: e.target.value})} placeholder="City, Country, or Remote" />
              
              <DropdownWithOther label="2. Industry" field="industry" options={['Tech/IT', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Non-Profit']} />
              <DropdownWithOther label="3. Job Type" field="job_type" options={['Full-Time', 'Part-Time', 'Internship', 'Freelance', 'Contract', 'Seasonal']} />
              <DropdownWithOther label="4. Experience Level" field="experience_level" options={['Entry-Level', 'Mid-Level', 'Senior', 'Expert/Principal']} />
              <DropdownWithOther label="5. Salary Range" field="salary_range" options={['Below Average', 'Average', 'Above Average', 'Negotiable']} />
            </div>

            <div style={groupStyle}>
              <h4>🏢 6-7, 13-15. Company & Role</h4>
              <label style={labelStyle}>6. Company Size (At least X employees)</label>
              <input type="number" style={inputStyle} value={editing.company_size_min || ''} onChange={e => setEditing({...editing, company_size_min: e.target.value})} placeholder="e.g. 50" />
              
              <DropdownWithOther label="7. Employment Sector" field="employment_sector" options={['Private', 'Public (Government)', 'Non-Profit', 'Academic', 'Start-up']} />
              <DropdownWithOther label="13. Job Function/Role" field="job_function" options={['Engineering', 'Marketing', 'HR', 'Sales', 'Customer Support', 'Data Analysis', 'Project Management']} />
              <DropdownWithOther label="14. Seniority Level" field="seniority_level" options={['Junior', 'Associate', 'Manager', 'Director', 'Executive (C-suite)']} />
              <DropdownWithOther label="15. Contract Type" field="contract_type" options={['Permanent', 'Temporary', 'Project-Based', 'Seasonal', 'Freelance']} />
            </div>
          </div>

          {/* COLUMN 2 */}
          <div>
            <div style={groupStyle}>
              <h4>🛠️ 8-9, 18-19. Skills & Education</h4>
              <label style={labelStyle}>8. Required Skills</label>
              <textarea style={{ ...inputStyle, height: '60px' }} value={editing.required_skills || 'Any'} onChange={e => setEditing({...editing, required_skills: e.target.value})} placeholder="Python, AWS, Communication..." />
              
              <DropdownWithOther label="9. Education Level" field="education_level" options={['High School', "Bachelor's", "Master's", 'PhD', 'Vocational Training', 'Ausbildung', 'Magister']} />
              <label style={labelStyle}>18. Application Requirements</label>
              <input style={inputStyle} value={editing.app_requirements || 'Any'} onChange={e => setEditing({...editing, app_requirements: e.target.value})} placeholder="Resume, Portfolio, etc." />
              <label style={labelStyle}>19. Certifications/Licenses</label>
              <input style={inputStyle} value={editing.certifications || 'Any'} onChange={e => setEditing({...editing, certifications: e.target.value})} placeholder="PMP, CPA, etc." />
            </div>

            <div style={groupStyle}>
              <h4>🌍 10-12, 16-17, 20-24. Culture & Environment</h4>
              <DropdownWithOther label="16. Remote Flexibility" field="remote_flexibility" options={['Fully Remote', 'Hybrid', 'On-Site Only']} />
              <DropdownWithOther label="10. Work Schedule" field="work_schedule" options={['Standard (9-5)', 'Flexible', 'Shift Work', 'Weekend Focus']} />
              <DropdownWithOther label="21. Travel Requirements" field="travel" options={['Minimal (0-10%)', 'Frequent (10-30%)', 'International']} />
              <DropdownWithOther label="20. Workplace Culture" field="culture" options={['Collaborative', 'Competitive', 'Casual', 'Structured', 'Family-Friendly', 'Remote-First']} />
              <DropdownWithOther label="24. Work-Life Balance" field="wlb" options={['Strong (Flexible)', 'Moderate', 'Challenging']} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🔍 Job Search Profiles</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Profile Name (e.g. Germany Remote)" style={{ padding: '10px', width: '250px', borderRadius: '6px', border: '1px solid #ccc' }} />
          <button onClick={async () => { await (window as any).electron.invoke('profiles:save', { userId, profileName: newName, is_active: 1 }); setNewName(''); loadProfiles(); }} style={{ padding: '10px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Create</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {profiles.map(p => (
          <div key={p.id} style={{ padding: '20px', background: p.is_speculative ? '#fffde7' : '#fff', border: '1px solid #ddd', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong style={{ fontSize: '18px' }}>{p.profile_name} {p.is_speculative && '🚀'}</strong>
              <span style={{ color: p.is_active ? '#4CAF50' : '#f44336', fontWeight: 'bold' }}>{p.is_active ? '● Active' : '○ Inactive'}</span>
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
              📍 {p.location || 'Anywhere'} | 🏢 {p.industry || 'Any Industry'}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEditing(p)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #0077b5', color: '#0077b5', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>⚙️ Set Criteria</button>
              <button 
                onClick={async () => { await (window as any).electron.invoke('profiles:update', { ...p, is_active: p.is_active ? 0 : 1 }); loadProfiles(); }} 
                style={{ padding: '8px 15px', borderRadius: '4px', background: p.is_active ? '#f44336' : '#4CAF50', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {p.is_active ? 'Deactivate' : 'Activate'}
              </button>
              {!p.is_speculative && (
                <button onClick={async () => { if(confirm("Delete this profile?")) { await (window as any).electron.invoke('profiles:delete', p.id); loadProfiles(); } }} style={{ padding: '8px', color: '#f44336', background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}