import { useState, useEffect } from 'react';

function LinkedInSection({ userId }: { userId: number }) {
  const [profile, setProfile] = useState<any>({ 
    name: '', title: '', location: '', photo: '',
    experiences: [], educations: [], licenses: [], skills: [], languages: [] 
  });
  const [url, setUrl] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const loadProfile = async () => {
    const result = await (window as any).electron.invoke('user:get-profile', userId);
    if (result?.success && result.data) {
      const d = result.data;
      setProfile({
        ...d,
        experiences: d.experiences ? JSON.parse(d.experiences) : [],
        educations: d.educations ? JSON.parse(d.educations) : [],
        licenses: d.licenses ? JSON.parse(d.licenses) : [],
        skills: d.skills ? JSON.parse(d.skills) : [],
        languages: d.languages ? JSON.parse(d.languages) : []
      });
      setUrl(d.linkedin_url || '');
    }
  };

  useEffect(() => { loadProfile(); }, [userId]);

  const handleCapture = async () => {
    const result = await (window as any).electron.invoke('user:capture-linkedin');
    if (result.success) {
      const n = result.data;
      setProfile((p: any) => ({
        ...p,
        name: n.name || p.name,
        title: n.title || p.title,
        photo: n.photo || p.photo,
        location: n.location || p.location,
        experiences: n.experienceList ? [...new Set([...p.experiences, ...n.experienceList])] : p.experiences,
        educations: n.educationList ? [...new Set([...p.educations, ...n.educationList])] : p.educations,
        licenses: n.licenseList ? [...new Set([...p.licenses, ...n.licenseList])] : p.licenses,
        skills: n.skillList ? [...new Set([...p.skills, ...n.skillList])] : p.skills,
        languages: n.languageList ? [...new Set([...p.languages, ...n.languageList])] : p.languages,
      }));
      setIsReviewing(true);
    }
  };

  const addItem = (field: string) => {
    setProfile({ ...profile, [field]: ['', ...profile[field]] });
  };

  const handleSaveFinal = async () => {
    const toSave = { ...profile, 
      experiences: JSON.stringify(profile.experiences),
      educations: JSON.stringify(profile.educations),
      licenses: JSON.stringify(profile.licenses),
      skills: JSON.stringify(profile.skills),
      languages: JSON.stringify(profile.languages),
      linkedin_url: url, id: userId 
    };
    await (window as any).electron.invoke('user:update-profile', toSave);
    alert("Master Profile Saved!");
    setIsReviewing(false);
  };

  if (isReviewing) {
    const sectionStyle = { marginBottom: '25px', padding: '15px', border: '1px solid #eee', borderRadius: '8px' };
    const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'sans-serif' };
    
    return (
      <div style={{ padding: '20px', background: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3>📝 Master Profile Editor</h3>
          <button onClick={handleSaveFinal} style={{ padding: '10px 20px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✅ Save Master Profile</button>
        </div>

        <div style={sectionStyle}>
          <h4>👤 Personal Details</h4>
          <div style={{ display: 'flex', gap: '20px' }}>
            {profile.photo && <img src={profile.photo} style={{ width: '100px', height: '100px', borderRadius: '8px', border: '1px solid #ddd' }} />}
            <div style={{ flex: 1 }}>
              <input style={inputStyle} placeholder="Full Name" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
              <input style={inputStyle} placeholder="Professional Title" value={profile.title} onChange={e => setProfile({...profile, title: e.target.value})} />
              <input style={inputStyle} placeholder="Location" value={profile.location} onChange={e => setProfile({...profile, location: e.target.value})} />
            </div>
          </div>
        </div>

        {[
          { label: '💼 Experience', field: 'experiences' },
          { label: '🎓 Education', field: 'educations' },
          { label: '📜 Licenses & Certifications', field: 'licenses' },
          { label: '🛠️ Skills', field: 'skills' },
          { label: '🌐 Languages', field: 'languages' }
        ].map(sec => (
          <div key={sec.field} style={sectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h4 style={{ margin: 0 }}>{sec.label}</h4>
              <button onClick={() => addItem(sec.field)} style={{ fontSize: '12px' }}>+ Add Manually</button>
            </div>
            {profile[sec.field].map((item: string, i: number) => (
              <textarea key={i} style={inputStyle} value={item} onChange={e => {
                const newList = [...profile[sec.field]];
                newList[i] = e.target.value;
                setProfile({...profile, [sec.field]: newList});
              }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h3>👤 LinkedIn Profile</h3>
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        <input type="text" value={url} onChange={e => setUrl(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="Paste LinkedIn URL here..." />
        <button onClick={() => (window as any).electron.invoke('user:open-linkedin', url)} style={{ padding: '12px 20px', marginRight: '10px', cursor: 'pointer' }}>1. Open LinkedIn</button>
        <button onClick={handleCapture} style={{ padding: '12px 20px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>2. Capture Current Page</button>
        <button onClick={() => setIsReviewing(true)} style={{ padding: '12px 20px', marginLeft: '10px', cursor: 'pointer' }}>✏️ Edit Manually</button>
      </div>
    </div>
  );
}

export default LinkedInSection;