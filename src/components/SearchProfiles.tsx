import { useState, useEffect } from 'react';

const JOB_TITLE_SUGGESTIONS = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Data Scientist', 'Product Manager', 'Project Manager', 'UX Designer', 'UI Designer',
  'DevOps Engineer', 'Cloud Architect', 'System Administrator', 'QA Engineer',
  'Business Analyst', 'Marketing Manager', 'Sales Representative', 'Customer Success Manager',
  'HR Manager', 'Financial Analyst', 'Accountant', 'Legal Counsel', 'Operations Manager'
];

const INDUSTRIES = ['Tech/IT', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Legal', 'Energy', 'Media', 'Construction'];
const LANGUAGES = ['English', 'German', 'Spanish', 'French', 'Mandarin', 'Japanese', 'Russian', 'Italian', 'Portuguese', 'Arabic'];

export function SearchProfiles({ userId }: { userId: number }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [newName, setNewName] = useState('');
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);

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

  const handleTitleChange = (val: string) => {
    setEditing({ ...editing, job_title: val });
    if (val.length > 1) {
      const filtered = JOB_TITLE_SUGGESTIONS.filter(s => s.toLowerCase().includes(val.toLowerCase()));
      setTitleSuggestions(filtered);
    } else {
      setTitleSuggestions([]);
    }
  };

  const toggleMultiSelect = (field: string, value: string) => {
    const current = editing[field] ? editing[field].split(',').map((s: string) => s.trim()) : [];
    const updated = current.includes(value) 
      ? current.filter((s: string) => s !== value) 
      : [...current, value];
    setEditing({ ...editing, [field]: updated.join(', ') });
  };

  const inputStyle = { width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '12px' };
  const labelStyle = { display: 'block', fontWeight: 'bold', marginBottom: '2px', color: '#0077b5', fontSize: '11px' };
  const groupStyle = { background: '#f9f9f9', padding: '12px', borderRadius: '10px', marginBottom: '12px', border: '1px solid #eee' };

  const MultiSelect = ({ label, field, options }: any) => {
    const current = editing[field] ? editing[field].split(',').map((s: string) => s.trim()) : [];
    return (
      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>{label}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '80px', overflowY: 'auto', padding: '5px', border: '1px solid #eee', borderRadius: '6px', background: '#fff' }}>
          {options.map((opt: string) => (
            <button 
              key={opt} 
              onClick={() => toggleMultiSelect(field, opt)}
              style={{ 
                padding: '2px 8px', fontSize: '10px', borderRadius: '12px', border: '1px solid #ccc',
                background: current.includes(opt) ? '#0077b5' : '#fff',
                color: current.includes(opt) ? '#fff' : '#666',
                cursor: 'pointer'
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (editing) {
    return (
      <div style={{ padding: '20px', background: '#fff', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>⚙️ {editing.is_speculative ? '🚀 Speculative Application Settings' : `Criteria: ${editing.profile_name}`}</h3>
          <button onClick={handleSave} style={{ padding: '10px 30px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>✅ Save Profile</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div>
            <div style={groupStyle}>
              <h4>🎯 Target & Core</h4>
              <label style={labelStyle}>21. Job Title (Target) *</label>
              <div style={{ position: 'relative' }}>
                <input 
                  style={inputStyle} 
                  value={editing.job_title || ''} 
                  onChange={e => handleTitleChange(e.target.value)} 
                  placeholder="Start typing job title..."
                />
                {titleSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ccc', borderRadius: '6px', zIndex: 10, maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {titleSuggestions.map(s => (
                      <div key={s} onClick={() => { setEditing({...editing, job_title: s}); setTitleSuggestions([]); }} style={{ padding: '8px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }}>{s}</div>
                    ))}
                  </div>
                )}
              </div>

              <label style={labelStyle}>1. Location</label>
              <input style={inputStyle} value={editing.location || 'Any'} onChange={e => setEditing({...editing, location: e.target.value})} />
              
              <MultiSelect label="2. Industries" field="industry" options={INDUSTRIES} />
              
              <label style={labelStyle}>3. Job Type</label>
              <select style={inputStyle} value={editing.job_type || 'Any'} onChange={e => setEditing({...editing, job_type: e.target.value})}>
                <option value="Any">Any</option>
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
                <option value="Contract">Contract</option>
              </select>

              <label style={labelStyle}>4. Experience Level</label>
              <select style={inputStyle} value={editing.experience_level || 'Any'} onChange={e => setEditing({...editing, experience_level: e.target.value})}>
                <option value="Any">Any</option>
                <option value="Entry-Level">Entry-Level</option>
                <option value="Mid-Level">Mid-Level</option>
                <option value="Senior">Senior</option>
                <option value="Expert">Expert</option>
                <option value="Lead">Lead</option>
                <option value="Manager">Manager</option>
              </select>
            </div>
          </div>

          <div>
            <div style={groupStyle}>
              <h4>🛠️ Skills & Education</h4>
              <label style={labelStyle}>8. Required Skills</label>
              <textarea style={{ ...inputStyle, height: '50px' }} value={editing.required_skills || 'Any'} onChange={e => setEditing({...editing, required_skills: e.target.value})} />
              
              <label style={labelStyle}>9. Education Level (Hunter finds this or below)</label>
              <select style={inputStyle} value={editing.education_level || 'Any'} onChange={e => setEditing({...editing, education_level: e.target.value})}>
                <option value="Any">Any</option>
                <option value="High School">High School</option>
                <option value="Vocational">Vocational / Ausbildung</option>
                <option value="Bachelor's">Bachelor's Degree</option>
                <option value="Master's">Master's Degree</option>
                <option value="PhD">PhD / Doctorate</option>
              </select>

              <label style={labelStyle}>10. Certifications</label>
              <input style={inputStyle} value={editing.certifications || 'Any'} onChange={e => setEditing({...editing, certifications: e.target.value})} />
              
              <MultiSelect label="11. Languages" field="languages" options={LANGUAGES} />
              
              <label style={labelStyle}>12. Benefits</label>
              <input style={inputStyle} value={editing.benefits || 'Any'} onChange={e => setEditing({...editing, benefits: e.target.value})} />
              
              <label style={labelStyle}>13. Visa Sponsorship</label>
              <select style={inputStyle} value={editing.visa_sponsorship || 'Any'} onChange={e => setEditing({...editing, visa_sponsorship: e.target.value})}>
                <option value="Any">Any</option>
                <option value="Required">Required</option>
                <option value="Not Required">Not Required</option>
                <option value="Provided">Provided</option>
              </select>
            </div>
          </div>

          <div>
            <div style={groupStyle}>
              <h4>🏢 Company & Logistics</h4>
              <label style={labelStyle}>15. Company Size</label>
              <select style={inputStyle} value={editing.company_size || 'Any'} onChange={e => setEditing({...editing, company_size: e.target.value})}>
                <option value="Any">Any</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501-1000">501-1000 employees</option>
                <option value="1001-5000">1001-5000 employees</option>
                <option value="5001-10000">5001-10000 employees</option>
                <option value="10001+">10001+ employees</option>
              </select>

              <label style={labelStyle}>16. Company Rating</label>
              <select style={inputStyle} value={editing.company_rating || 'Any'} onChange={e => setEditing({...editing, company_rating: e.target.value})}>
                <option value="Any">Any</option>
                <option value="3.0+">3.0+ Stars</option>
                <option value="3.5+">3.5+ Stars</option>
                <option value="4.0+">4.0+ Stars</option>
                <option value="4.5+">4.5+ Stars</option>
              </select>
              
              <label style={labelStyle}>17. Deadline</label>
              <input type="date" style={inputStyle} value={editing.deadline || ''} onChange={e => setEditing({...editing, deadline: e.target.value})} />
              
              <label style={labelStyle}>18. Travel Requirement</label>
              <select style={inputStyle} value={editing.travel_requirement || 'Any'} onChange={e => setEditing({...editing, travel_requirement: e.target.value})}>
                <option value="Any">Any</option>
                <option value="None">None</option>
                <option value="0-25%">0-25%</option>
                <option value="25-50%">25-50%</option>
                <option value="50-75%">50-75%</option>
                <option value="75-100%">75-100%</option>
              </select>

              <label style={labelStyle}>20. Company Name (Target)</label>
              <input style={inputStyle} value={editing.company_name || 'Any'} onChange={e => setEditing({...editing, company_name: e.target.value})} />
              
              <label style={labelStyle}>22. Posted Date (Within)</label>
              <select style={inputStyle} value={editing.posted_within || 'Any'} onChange={e => setEditing({...editing, posted_within: e.target.value})}>
                <option value="Any">Any Time</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <button onClick={() => setEditing(null)} style={{ padding: '10px 30px', background: '#ccc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>🔍 Search Profiles</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New Profile Name..." style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', flex: 1 }} />
        <button onClick={async () => { if(!newName) return; await (window as any).electron.invoke('profiles:save', { userId, profileName: newName, is_active: 1 }); setNewName(''); loadProfiles(); }} style={{ padding: '10px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Create Profile</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
        {profiles.map(p => (
          <div key={p.id} style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '12px', background: p.is_speculative ? '#fffde7' : '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}>{p.profile_name} {p.is_speculative && '🚀'}</div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
              📍 {p.location || 'Any'} | 🏢 {p.industry || 'Any'}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setEditing(p)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #0077b5', color: '#0077b5', background: '#fff', cursor: 'pointer' }}>⚙️ Configure</button>
              <button onClick={async () => { await (window as any).electron.invoke('profiles:update', { ...p, is_active: p.is_active ? 0 : 1 }); loadProfiles(); }} style={{ padding: '8px 15px', borderRadius: '6px', border: 'none', background: p.is_active ? '#4CAF50' : '#ccc', color: '#fff', cursor: 'pointer' }}>{p.is_active ? 'ON' : 'OFF'}</button>
              {!p.is_speculative && <button onClick={async () => { if(confirm("Delete this profile?")) { await (window as any).electron.invoke('profiles:delete', p.id); loadProfiles(); } }} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #f44336', color: '#f44336', background: '#fff', cursor: 'pointer' }}>🗑️</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}