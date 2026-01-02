import { useState, useEffect } from 'react';

interface ProfileData {
  name: string;
  title: string;
  location: string;
  photo: string;
  phone: string;
  email: string;
  website: string;
  summary: string;
  experiences: Experience[];
  educations: Education[];
  licenses: string[];
  skills: string[];
  languages: string[];
  projects: Project[];
  awards: string[];
  publications: string[];
  volunteer: string[];
}

interface Experience {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Education {
  school: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
  description: string;
}

interface Project {
  name: string;
  description: string;
  url: string;
}

const defaultProfile: ProfileData = {
  name: '', title: '', location: '', photo: '', phone: '', email: '', website: '', summary: '',
  experiences: [], educations: [], licenses: [], skills: [], languages: [],
  projects: [], awards: [], publications: [], volunteer: []
};

function LinkedInSection({ userId }: { userId: number }) {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [url, setUrl] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [importedData, setImportedData] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const loadProfile = async () => {
    const result = await (window as any).electron.invoke('user:get-profile', userId);
    if (result?.success && result.data) {
      const d = result.data;
      setProfile({
        ...defaultProfile,
        ...d,
        experiences: d.experiences ? JSON.parse(d.experiences) : [],
        educations: d.educations ? JSON.parse(d.educations) : [],
        licenses: d.licenses ? JSON.parse(d.licenses) : [],
        skills: d.skills ? JSON.parse(d.skills) : [],
        languages: d.languages ? JSON.parse(d.languages) : [],
        projects: d.projects ? JSON.parse(d.projects) : [],
        awards: d.awards ? JSON.parse(d.awards) : [],
        publications: d.publications ? JSON.parse(d.publications) : [],
        volunteer: d.volunteer ? JSON.parse(d.volunteer) : []
      });
      setUrl(d.linkedin_url || '');
    }
  };

  useEffect(() => { loadProfile(); }, [userId]);

  const handleCapture = async () => {
    const result = await (window as any).electron.invoke('user:capture-linkedin');
    if (result.success) {
      setImportedData(result.data);
      setIsReviewing(true);
    }
  };

  const acceptImportedData = () => {
    if (!importedData) return;
    const n = importedData;
    setProfile((p) => ({
      ...p,
      name: n.name || p.name,
      title: n.title || p.title,
      photo: n.photo || p.photo,
      location: n.location || p.location,
      summary: n.summary || p.summary,
      experiences: n.experienceList ? [...p.experiences, ...n.experienceList] : p.experiences,
      educations: n.educationList ? [...p.educations, ...n.educationList] : p.educations,
      licenses: n.licenseList ? [...new Set([...p.licenses, ...n.licenseList])] : p.licenses,
      skills: n.skillList ? [...new Set([...p.skills, ...n.skillList])] : p.skills,
      languages: n.languageList ? [...new Set([...p.languages, ...n.languageList])] : p.languages,
    }));
    setImportedData(null);
  };

  const deleteImportedItem = (field: string, index: number) => {
    if (importedData && importedData[field]) {
      const newData = {...importedData};
      newData[field].splice(index, 1);
      setImportedData(newData);
    }
  };

  const handleSaveFinal = async () => {
    const toSave = { 
      ...profile, 
      experiences: JSON.stringify(profile.experiences),
      educations: JSON.stringify(profile.educations),
      licenses: JSON.stringify(profile.licenses),
      skills: JSON.stringify(profile.skills),
      languages: JSON.stringify(profile.languages),
      projects: JSON.stringify(profile.projects),
      awards: JSON.stringify(profile.awards),
      publications: JSON.stringify(profile.publications),
      volunteer: JSON.stringify(profile.volunteer),
      linkedin_url: url, 
      id: userId 
    };
    await (window as any).electron.invoke('user:update-profile', toSave);
    alert("Master Profile Saved! This data will be used for generating CVs and motivation letters.");
    setIsReviewing(false);
  };

  const sectionStyle = { marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '8px', background: '#fafafa' };
  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'sans-serif', fontSize: '13px' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#333' };

  // Import Review Modal
  if (importedData) {
    return (
      <div style={{ padding: '20px', background: '#fff' }}>
        <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#ef6c00' }}>📥 Review Imported LinkedIn Data</h3>
          <p style={{ fontSize: '13px', color: '#666' }}>
            The following data was extracted from your LinkedIn profile. 
            <strong> Please review and delete any items you don't want to import.</strong>
            This data will be used to generate CVs and motivation letters.
          </p>
        </div>

        {/* Personal Info */}
        <div style={sectionStyle}>
          <h4>👤 Personal Info</h4>
          {importedData.photo && <img src={importedData.photo} style={{ width: '80px', height: '80px', borderRadius: '8px', marginBottom: '10px' }} alt="" />}
          <p><strong>Name:</strong> {importedData.name}</p>
          <p><strong>Title:</strong> {importedData.title}</p>
          <p><strong>Location:</strong> {importedData.location}</p>
        </div>

        {/* Experience */}
        {importedData.experienceList?.length > 0 && (
          <div style={sectionStyle}>
            <h4>💼 Experience ({importedData.experienceList.length} items)</h4>
            {importedData.experienceList.map((exp: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', border: '1px solid #eee', borderRadius: '6px', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px' }}>{typeof exp === 'string' ? exp : `${exp.title} at ${exp.company}`}</span>
                <button onClick={() => deleteImportedItem('experienceList', i)} style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {importedData.skillList?.length > 0 && (
          <div style={sectionStyle}>
            <h4>🛠️ Skills ({importedData.skillList.length} items)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {importedData.skillList.map((skill: string, i: number) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#e3f2fd', borderRadius: '12px', fontSize: '11px' }}>
                  {skill}
                  <button onClick={() => deleteImportedItem('skillList', i)} style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', padding: 0, fontSize: '14px' }}>×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
          <button onClick={acceptImportedData} style={{ padding: '12px 30px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Accept & Continue Editing</button>
          <button onClick={() => setImportedData(null)} style={{ padding: '12px 30px', background: '#ccc', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel Import</button>
        </div>
      </div>
    );
  }

  // Profile Editor
  if (isReviewing) {
    return (
      <div style={{ padding: '20px', background: '#fff', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', position: 'sticky', top: 0, background: '#fff', padding: '10px 0', borderBottom: '1px solid #eee', zIndex: 10 }}>
          <h3 style={{ margin: 0 }}>📝 Master Profile Editor</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setIsReviewing(false)} style={{ padding: '10px 20px', background: '#ccc', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>← Back</button>
            <button onClick={handleSaveFinal} style={{ padding: '10px 25px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>💾 Save Profile</button>
          </div>
        </div>

        {/* Personal Details */}
        <div style={sectionStyle}>
          <h4>👤 Personal Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '20px', alignItems: 'start' }}>
            <div>
              {profile.photo && <img src={profile.photo} style={{ width: '100px', height: '100px', borderRadius: '8px', border: '1px solid #ddd' }} alt="" />}
              <label style={{...labelStyle, marginTop: '10px'}}>Photo URL</label>
              <input style={{...inputStyle, width: '100px'}} value={profile.photo} onChange={e => setProfile({...profile, photo: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input style={inputStyle} value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Professional Title</label>
                <input style={inputStyle} value={profile.title} onChange={e => setProfile({...profile, title: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input style={inputStyle} value={profile.location} onChange={e => setProfile({...profile, location: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Website/Portfolio</label>
                <input style={inputStyle} value={profile.website} onChange={e => setProfile({...profile, website: e.target.value})} />
              </div>
            </div>
          </div>
          <label style={labelStyle}>Professional Summary</label>
          <textarea style={{...inputStyle, height: '80px'}} value={profile.summary} onChange={e => setProfile({...profile, summary: e.target.value})} placeholder="Brief professional summary..." />
        </div>

        {/* Experience */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h4 style={{ margin: 0 }}>💼 Work Experience</h4>
            <button onClick={() => setProfile({...profile, experiences: [{company: '', title: '', location: '', startDate: '', endDate: '', description: ''}, ...profile.experiences]})} style={{ padding: '5px 15px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>+ Add</button>
          </div>
          {profile.experiences.map((exp, i) => (
            <div key={i} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px', background: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input style={inputStyle} placeholder="Job Title" value={exp.title} onChange={e => { const newExp = [...profile.experiences]; newExp[i].title = e.target.value; setProfile({...profile, experiences: newExp}); }} />
                <input style={inputStyle} placeholder="Company" value={exp.company} onChange={e => { const newExp = [...profile.experiences]; newExp[i].company = e.target.value; setProfile({...profile, experiences: newExp}); }} />
                <input style={inputStyle} placeholder="Location" value={exp.location} onChange={e => { const newExp = [...profile.experiences]; newExp[i].location = e.target.value; setProfile({...profile, experiences: newExp}); }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input style={{...inputStyle, flex: 1}} type="month" placeholder="Start" value={exp.startDate} onChange={e => { const newExp = [...profile.experiences]; newExp[i].startDate = e.target.value; setProfile({...profile, experiences: newExp}); }} />
                  <input style={{...inputStyle, flex: 1}} type="month" placeholder="End" value={exp.endDate} onChange={e => { const newExp = [...profile.experiences]; newExp[i].endDate = e.target.value; setProfile({...profile, experiences: newExp}); }} />
                </div>
              </div>
              <textarea style={{...inputStyle, height: '60px'}} placeholder="Description of role and achievements..." value={exp.description} onChange={e => { const newExp = [...profile.experiences]; newExp[i].description = e.target.value; setProfile({...profile, experiences: newExp}); }} />
              <button onClick={() => setProfile({...profile, experiences: profile.experiences.filter((_, idx) => idx !== i)})} style={{ background: '#f44336', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Remove</button>
            </div>
          ))}
        </div>

        {/* Education */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h4 style={{ margin: 0 }}>🎓 Education</h4>
            <button onClick={() => setProfile({...profile, educations: [{school: '', degree: '', field: '', startYear: '', endYear: '', description: ''}, ...profile.educations]})} style={{ padding: '5px 15px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>+ Add</button>
          </div>
          {profile.educations.map((edu, i) => (
            <div key={i} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px', background: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input style={inputStyle} placeholder="School/University" value={edu.school} onChange={e => { const newEdu = [...profile.educations]; newEdu[i].school = e.target.value; setProfile({...profile, educations: newEdu}); }} />
                <input style={inputStyle} placeholder="Degree" value={edu.degree} onChange={e => { const newEdu = [...profile.educations]; newEdu[i].degree = e.target.value; setProfile({...profile, educations: newEdu}); }} />
                <input style={inputStyle} placeholder="Field of Study" value={edu.field} onChange={e => { const newEdu = [...profile.educations]; newEdu[i].field = e.target.value; setProfile({...profile, educations: newEdu}); }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input style={{...inputStyle, flex: 1}} placeholder="Start Year" value={edu.startYear} onChange={e => { const newEdu = [...profile.educations]; newEdu[i].startYear = e.target.value; setProfile({...profile, educations: newEdu}); }} />
                  <input style={{...inputStyle, flex: 1}} placeholder="End Year" value={edu.endYear} onChange={e => { const newEdu = [...profile.educations]; newEdu[i].endYear = e.target.value; setProfile({...profile, educations: newEdu}); }} />
                </div>
              </div>
              <button onClick={() => setProfile({...profile, educations: profile.educations.filter((_, idx) => idx !== i)})} style={{ background: '#f44336', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Remove</button>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div style={sectionStyle}>
          <h4>🛠️ Skills</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
            {profile.skills.map((skill, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#e3f2fd', borderRadius: '12px', fontSize: '12px' }}>
                {skill}
                <button onClick={() => setProfile({...profile, skills: profile.skills.filter((_, idx) => idx !== i)})} style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input id="newSkill" style={{...inputStyle, marginBottom: 0, flex: 1}} placeholder="Add new skill..." onKeyPress={e => { if (e.key === 'Enter') { const val = (e.target as HTMLInputElement).value; if (val) { setProfile({...profile, skills: [...profile.skills, val]}); (e.target as HTMLInputElement).value = ''; }}}} />
            <button onClick={() => { const input = document.getElementById('newSkill') as HTMLInputElement; if (input.value) { setProfile({...profile, skills: [...profile.skills, input.value]}); input.value = ''; }}} style={{ padding: '10px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Add</button>
          </div>
        </div>

        {/* Certifications */}
        <div style={sectionStyle}>
          <h4>📜 Licenses & Certifications</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
            {profile.licenses.map((lic, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#fff3e0', borderRadius: '12px', fontSize: '12px' }}>
                {lic}
                <button onClick={() => setProfile({...profile, licenses: profile.licenses.filter((_, idx) => idx !== i)})} style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input id="newLicense" style={{...inputStyle, marginBottom: 0, flex: 1}} placeholder="Add certification..." onKeyPress={e => { if (e.key === 'Enter') { const val = (e.target as HTMLInputElement).value; if (val) { setProfile({...profile, licenses: [...profile.licenses, val]}); (e.target as HTMLInputElement).value = ''; }}}} />
            <button onClick={() => { const input = document.getElementById('newLicense') as HTMLInputElement; if (input.value) { setProfile({...profile, licenses: [...profile.licenses, input.value]}); input.value = ''; }}} style={{ padding: '10px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Add</button>
          </div>
        </div>

        {/* Languages */}
        <div style={sectionStyle}>
          <h4>🌐 Languages</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
            {profile.languages.map((lang, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#e8f5e9', borderRadius: '12px', fontSize: '12px' }}>
                {lang}
                <button onClick={() => setProfile({...profile, languages: profile.languages.filter((_, idx) => idx !== i)})} style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input id="newLang" style={{...inputStyle, marginBottom: 0, flex: 1}} placeholder="Add language..." onKeyPress={e => { if (e.key === 'Enter') { const val = (e.target as HTMLInputElement).value; if (val) { setProfile({...profile, languages: [...profile.languages, val]}); (e.target as HTMLInputElement).value = ''; }}}} />
            <button onClick={() => { const input = document.getElementById('newLang') as HTMLInputElement; if (input.value) { setProfile({...profile, languages: [...profile.languages, input.value]}); input.value = ''; }}} style={{ padding: '10px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Add</button>
          </div>
        </div>
      </div>
    );
  }

  // Main LinkedIn Section View
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: 'var(--bg-primary)' }}>
      <h3 style={{ color: 'var(--text-primary)' }}>👤 LinkedIn Profile Import</h3>
      
      <div style={{ background: 'var(--info-light)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--info)' }}>
          <strong>ℹ️ How it works:</strong> Your profile data will be used to automatically generate tailored CVs and motivation letters for each job application.
        </p>
      </div>

      <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <label style={labelStyle}>LinkedIn Profile URL</label>
        <input 
          type="text" 
          value={url} 
          onChange={e => setUrl(e.target.value)} 
          style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} 
          placeholder="https://linkedin.com/in/your-profile" 
        />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => (window as any).electron.invoke('user:open-linkedin', url)} style={{ padding: '12px 20px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #0077b5', background: 'var(--card-bg)', color: '#0077b5' }}>
            Open LinkedIn
          </button>
        </div>
      </div>

      {/* Current Profile Summary */}
      {profile.name && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h4 style={{ marginTop: 0 }}>📋 Current Profile</h4>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'start' }}>
            {profile.photo && <img src={profile.photo} style={{ width: '60px', height: '60px', borderRadius: '8px' }} alt="" />}
            <div>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '16px' }}>{profile.name}</p>
              <p style={{ margin: '0 0 5px 0', color: '#666' }}>{profile.title}</p>
              <p style={{ margin: '0', fontSize: '13px', color: '#999' }}>{profile.location}</p>
            </div>
          </div>
          <div style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '15px', fontSize: '12px', color: '#666' }}>
            <span>💼 {profile.experiences.length} Experiences</span>
            <span>🎓 {profile.educations.length} Education</span>
            <span>🛠️ {profile.skills.length} Skills</span>
            <span>📜 {profile.licenses.length} Certifications</span>
          </div>
          <button onClick={() => setIsReviewing(true)} style={{ marginTop: '15px', padding: '8px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            ✏️ Edit Full Profile
          </button>
        </div>
      )}
    </div>
  );
}

export default LinkedInSection;
