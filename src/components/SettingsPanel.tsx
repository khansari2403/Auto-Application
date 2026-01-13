import { useState, useEffect } from 'react';
import LinkedInSection from './settings/LinkedInSection';
import AIModelsSection from './settings/AIModelsSection';
import EmailMonitoringSection from './settings/EmailMonitoringSection';
import { StorageSettings } from './settings/StorageSettings';
import '../styles/SettingsPanel.css';

/**
 * Settings Panel Component
 * Manages core application configurations.
 */
function SettingsPanel({ userId }: { userId: number }) {
  const [activeSection, setActiveSection] = useState('linkedin');

  const navButtons = [
    { id: 'linkedin', icon: '👤', label: 'LinkedIn Profile' },
    { id: 'manual', icon: '📝', label: 'Manual Profile' },
    { id: 'ai', icon: '🤖', label: 'AI Team' },
    { id: 'storage', icon: '💾', label: 'Storage' },
    { id: 'email', icon: '📧', label: 'Email & Secretary' },
  ];

  return (
    <div className="settings-panel">
      <nav className="settings-nav">
        {navButtons.map(btn => (
          <button 
            key={btn.id}
            className={`settings-nav-button ${activeSection === btn.id ? 'active' : ''}`}
            onClick={() => setActiveSection(btn.id)}
          >
            {btn.icon} {btn.label}
          </button>
        ))}
      </nav>

      <div className="settings-content">
        {activeSection === 'linkedin' && <LinkedInSection userId={userId} />}
        {activeSection === 'manual' && <ManualProfileSection userId={userId} />}
        {activeSection === 'ai' && <AIModelsSection userId={userId} />}
        {activeSection === 'storage' && <StorageSettings userId={userId} />}
        {activeSection === 'email' && <EmailMonitoringSection userId={userId} />}
      </div>
    </div>
  );
}

/**
 * Manual Profile Section - For users who want to enter profile data manually
 */
function ManualProfileSection({ userId }: { userId: number }) {
  const [profile, setProfile] = useState({
    name: '', title: '', email: '', phone: '', location: '', website: '',
    summary: '', photo: '',
    photoOffsetX: 0, // For positioning the photo
    photoOffsetY: 0,
    photoZoom: 100,
    // Arrays stored as comma-separated for simplicity
    skills: '',
    languages: '',
    certifications: '',
    interests: ''
  });
  const [experiences, setExperiences] = useState<any[]>([]);
  const [educations, setEducations] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPhotoAdjust, setShowPhotoAdjust] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved profile on mount
  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const result = await (window as any).electron.invoke('user:get-profile', userId);
      if (result?.success && result.data) {
        const data = result.data;
        setProfile({
          name: data.name || '',
          title: data.title || '',
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          website: data.website || '',
          summary: data.summary || '',
          photo: data.photo || '',
          photoOffsetX: data.photoOffsetX || 0,
          photoOffsetY: data.photoOffsetY || 0,
          photoZoom: data.photoZoom || 100,
          skills: data.skills || '',
          languages: data.languages || '',
          certifications: data.certifications || '',
          interests: data.interests || ''
        });
        // Parse JSON arrays if stored
        try {
          setExperiences(data.experiences ? (typeof data.experiences === 'string' ? JSON.parse(data.experiences) : data.experiences) : []);
        } catch { setExperiences([]); }
        try {
          setEducations(data.educations ? (typeof data.educations === 'string' ? JSON.parse(data.educations) : data.educations) : []);
        } catch { setEducations([]); }
        try {
          setProjects(data.projects ? (typeof data.projects === 'string' ? JSON.parse(data.projects) : data.projects) : []);
        } catch { setProjects([]); }
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    }
    setIsLoading(false);
  };

  const inputStyle: React.CSSProperties = { 
    width: '100%', 
    padding: '10px', 
    marginBottom: '10px', 
    border: '1px solid #ddd', 
    borderRadius: '6px', 
    fontSize: '13px' 
  };
  const labelStyle: React.CSSProperties = { 
    display: 'block', 
    marginBottom: '4px', 
    fontSize: '12px', 
    fontWeight: 600, 
    color: '#333' 
  };
  const sectionStyle: React.CSSProperties = { 
    marginBottom: '20px', 
    padding: '15px', 
    border: '1px solid #eee', 
    borderRadius: '8px', 
    background: '#fafafa' 
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const toSave = {
        ...profile,
        experiences: JSON.stringify(experiences),
        educations: JSON.stringify(educations),
        projects: JSON.stringify(projects),
        id: userId
      };
      await (window as any).electron.invoke('user:update-profile', toSave);
      alert('Profile saved successfully!');
    } catch (e) {
      alert('Error saving profile');
    }
    setIsSaving(false);
  };

  const addExperience = () => {
    setExperiences([...experiences, { company: '', title: '', location: '', startDate: '', endDate: '', current: false, description: '' }]);
  };

  const addEducation = () => {
    setEducations([...educations, { school: '', degree: '', field: '', startYear: '', endYear: '', description: '' }]);
  };

  const addProject = () => {
    setProjects([...projects, { name: '', description: '', url: '', technologies: '' }]);
  };

  return (
    <div style={{ padding: '20px', maxHeight: '85vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0 }}>📝 Manual Profile Entry</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#666' }}>
            Enter your profile information manually. All fields are optional.
          </p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          style={{ 
            padding: '12px 30px', 
            background: '#4CAF50', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            opacity: isSaving ? 0.7 : 1
          }}
        >
          {isSaving ? 'Saving...' : '💾 Save Profile'}
        </button>
      </div>

      {/* Personal Info */}
      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0 }}>👤 Personal Information</h4>
        
        {/* Photo Upload Section */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              border: '3px solid #0077b5',
              background: profile.photo 
                ? `url(${profile.photo}) ${50 + (profile.photoOffsetX || 0)}% ${50 + (profile.photoOffsetY || 0)}% / ${profile.photoZoom || 100}%` 
                : '#f0f0f0',
              backgroundRepeat: 'no-repeat',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              color: '#999',
              overflow: 'hidden',
              flexShrink: 0,
              cursor: profile.photo ? 'pointer' : 'default'
            }}
            onClick={() => profile.photo && setShowPhotoAdjust(!showPhotoAdjust)}
            title={profile.photo ? 'Click to adjust position' : ''}
            >
              {!profile.photo && '👤'}
            </div>
            {profile.photo && (
              <button 
                onClick={() => setShowPhotoAdjust(!showPhotoAdjust)}
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '11px', 
                  background: showPhotoAdjust ? '#0077b5' : '#e0e0e0', 
                  color: showPhotoAdjust ? '#fff' : '#333',
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer' 
                }}
              >
                🎯 Adjust Position
              </button>
            )}
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Profile Headshot</label>
            <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px 0' }}>
              Upload a professional headshot for your CV and applications
            </p>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setProfile({...profile, photo: reader.result as string, photoOffsetX: 0, photoOffsetY: 0, photoZoom: 100});
                    setShowPhotoAdjust(true);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              style={{ marginBottom: '8px' }}
            />
            <div style={{ fontSize: '11px', color: '#999' }}>Or paste a URL:</div>
            <input 
              style={{...inputStyle, marginTop: '4px'}} 
              value={profile.photo} 
              onChange={e => setProfile({...profile, photo: e.target.value})} 
              placeholder="https://example.com/photo.jpg" 
            />
            
            {/* Photo Adjustment Controls */}
            {showPhotoAdjust && profile.photo && (
              <div style={{ 
                marginTop: '15px', 
                padding: '15px', 
                background: '#f0f7ff', 
                borderRadius: '8px',
                border: '1px solid #bbdefb'
              }}>
                <h5 style={{ margin: '0 0 12px 0', color: '#0077b5', fontSize: '13px' }}>🎯 Adjust Photo Position</h5>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    Horizontal Position: {profile.photoOffsetX || 0}%
                  </label>
                  <input 
                    type="range" 
                    min="-50" 
                    max="50" 
                    value={profile.photoOffsetX || 0}
                    onChange={(e) => setProfile({...profile, photoOffsetX: parseInt(e.target.value)})}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
                    <span>← Left</span>
                    <span>Right →</span>
                  </div>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    Vertical Position: {profile.photoOffsetY || 0}%
                  </label>
                  <input 
                    type="range" 
                    min="-50" 
                    max="50" 
                    value={profile.photoOffsetY || 0}
                    onChange={(e) => setProfile({...profile, photoOffsetY: parseInt(e.target.value)})}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
                    <span>↑ Up</span>
                    <span>Down ↓</span>
                  </div>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    Zoom: {profile.photoZoom || 100}%
                  </label>
                  <input 
                    type="range" 
                    min="50" 
                    max="200" 
                    value={profile.photoZoom || 100}
                    onChange={(e) => setProfile({...profile, photoZoom: parseInt(e.target.value)})}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
                    <span>Zoom Out</span>
                    <span>Zoom In</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => setProfile({...profile, photoOffsetX: 0, photoOffsetY: 0, photoZoom: 100})}
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '11px', 
                    background: '#fff', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px', 
                    cursor: 'pointer' 
                  }}
                >
                  Reset to Center
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} placeholder="John Doe" />
          </div>
          <div>
            <label style={labelStyle}>Professional Title</label>
            <input style={inputStyle} value={profile.title} onChange={e => setProfile({...profile, title: e.target.value})} placeholder="Software Engineer" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} placeholder="john@example.com" />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="+1 234 567 8900" />
          </div>
          <div>
            <label style={labelStyle}>Location</label>
            <input style={inputStyle} value={profile.location} onChange={e => setProfile({...profile, location: e.target.value})} placeholder="City, Country" />
          </div>
          <div>
            <label style={labelStyle}>Website / Portfolio</label>
            <input style={inputStyle} value={profile.website} onChange={e => setProfile({...profile, website: e.target.value})} placeholder="https://yourwebsite.com" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Professional Summary</label>
            <textarea 
              style={{...inputStyle, height: '100px'}} 
              value={profile.summary} 
              onChange={e => setProfile({...profile, summary: e.target.value})} 
              placeholder="Brief summary of your professional background and goals..."
            />
          </div>
        </div>
      </div>

      {/* Work Experience */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0 }}>💼 Work Experience</h4>
          <button onClick={addExperience} style={{ padding: '6px 15px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>+ Add Experience</button>
        </div>
        {experiences.map((exp, i) => (
          <div key={i} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px', background: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Job Title</label>
                <input style={inputStyle} value={exp.title} onChange={e => { const n = [...experiences]; n[i].title = e.target.value; setExperiences(n); }} placeholder="Software Engineer" />
              </div>
              <div>
                <label style={labelStyle}>Company</label>
                <input style={inputStyle} value={exp.company} onChange={e => { const n = [...experiences]; n[i].company = e.target.value; setExperiences(n); }} placeholder="Company Name" />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input style={inputStyle} value={exp.location} onChange={e => { const n = [...experiences]; n[i].location = e.target.value; setExperiences(n); }} placeholder="City, Country" />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Start Date</label>
                  <input style={inputStyle} type="month" value={exp.startDate} onChange={e => { const n = [...experiences]; n[i].startDate = e.target.value; setExperiences(n); }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>End Date</label>
                  <input style={inputStyle} type="month" value={exp.endDate} onChange={e => { const n = [...experiences]; n[i].endDate = e.target.value; setExperiences(n); }} disabled={exp.current} />
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                  <input type="checkbox" checked={exp.current} onChange={e => { const n = [...experiences]; n[i].current = e.target.checked; if (e.target.checked) n[i].endDate = ''; setExperiences(n); }} />
                  Currently working here
                </label>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Description / Achievements</label>
                <textarea style={{...inputStyle, height: '80px'}} value={exp.description} onChange={e => { const n = [...experiences]; n[i].description = e.target.value; setExperiences(n); }} placeholder="Describe your responsibilities and achievements..." />
              </div>
            </div>
            <button onClick={() => setExperiences(experiences.filter((_, idx) => idx !== i))} style={{ marginTop: '10px', padding: '5px 15px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Remove</button>
          </div>
        ))}
        {experiences.length === 0 && <p style={{ color: '#999', fontSize: '13px' }}>No work experience added yet. Click "Add Experience" to start.</p>}
      </div>

      {/* Education */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0 }}>🎓 Education</h4>
          <button onClick={addEducation} style={{ padding: '6px 15px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>+ Add Education</button>
        </div>
        {educations.map((edu, i) => (
          <div key={i} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px', background: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>School / University</label>
                <input style={inputStyle} value={edu.school} onChange={e => { const n = [...educations]; n[i].school = e.target.value; setEducations(n); }} placeholder="University Name" />
              </div>
              <div>
                <label style={labelStyle}>Degree</label>
                <input style={inputStyle} value={edu.degree} onChange={e => { const n = [...educations]; n[i].degree = e.target.value; setEducations(n); }} placeholder="Bachelor's, Master's, etc." />
              </div>
              <div>
                <label style={labelStyle}>Field of Study</label>
                <input style={inputStyle} value={edu.field} onChange={e => { const n = [...educations]; n[i].field = e.target.value; setEducations(n); }} placeholder="Computer Science" />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Start Year</label>
                  <input style={inputStyle} value={edu.startYear} onChange={e => { const n = [...educations]; n[i].startYear = e.target.value; setEducations(n); }} placeholder="2018" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>End Year</label>
                  <input style={inputStyle} value={edu.endYear} onChange={e => { const n = [...educations]; n[i].endYear = e.target.value; setEducations(n); }} placeholder="2022" />
                </div>
              </div>
            </div>
            <button onClick={() => setEducations(educations.filter((_, idx) => idx !== i))} style={{ marginTop: '10px', padding: '5px 15px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Remove</button>
          </div>
        ))}
        {educations.length === 0 && <p style={{ color: '#999', fontSize: '13px' }}>No education added yet.</p>}
      </div>

      {/* Skills & Languages */}
      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0 }}>🛠️ Skills & Languages</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={labelStyle}>Skills (comma separated)</label>
            <textarea style={{...inputStyle, height: '80px'}} value={profile.skills} onChange={e => setProfile({...profile, skills: e.target.value})} placeholder="JavaScript, Python, Project Management, etc." />
          </div>
          <div>
            <label style={labelStyle}>Languages (comma separated)</label>
            <textarea style={{...inputStyle, height: '80px'}} value={profile.languages} onChange={e => setProfile({...profile, languages: e.target.value})} placeholder="English (Native), German (Fluent), etc." />
          </div>
          <div>
            <label style={labelStyle}>Certifications (comma separated)</label>
            <textarea style={{...inputStyle, height: '80px'}} value={profile.certifications} onChange={e => setProfile({...profile, certifications: e.target.value})} placeholder="PMP, AWS Certified, etc." />
          </div>
          <div>
            <label style={labelStyle}>Interests & Hobbies (comma separated)</label>
            <textarea style={{...inputStyle, height: '80px'}} value={profile.interests} onChange={e => setProfile({...profile, interests: e.target.value})} placeholder="Open Source, AI, Traveling, etc." />
          </div>
        </div>
      </div>

      {/* Projects */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0 }}>🚀 Projects & Portfolio</h4>
          <button onClick={addProject} style={{ padding: '6px 15px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>+ Add Project</button>
        </div>
        {projects.map((proj, i) => (
          <div key={i} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px', background: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Project Name</label>
                <input style={inputStyle} value={proj.name} onChange={e => { const n = [...projects]; n[i].name = e.target.value; setProjects(n); }} placeholder="My Awesome Project" />
              </div>
              <div>
                <label style={labelStyle}>Project URL</label>
                <input style={inputStyle} value={proj.url} onChange={e => { const n = [...projects]; n[i].url = e.target.value; setProjects(n); }} placeholder="https://github.com/..." />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Technologies Used</label>
                <input style={inputStyle} value={proj.technologies} onChange={e => { const n = [...projects]; n[i].technologies = e.target.value; setProjects(n); }} placeholder="React, Node.js, PostgreSQL" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Description</label>
                <textarea style={{...inputStyle, height: '60px'}} value={proj.description} onChange={e => { const n = [...projects]; n[i].description = e.target.value; setProjects(n); }} placeholder="What does this project do?" />
              </div>
            </div>
            <button onClick={() => setProjects(projects.filter((_, idx) => idx !== i))} style={{ marginTop: '10px', padding: '5px 15px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Remove</button>
          </div>
        ))}
        {projects.length === 0 && <p style={{ color: '#999', fontSize: '13px' }}>No projects added yet.</p>}
      </div>

      {/* Save Button at bottom */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          style={{ 
            padding: '15px 50px', 
            background: '#4CAF50', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            fontSize: '16px',
            opacity: isSaving ? 0.7 : 1
          }}
        >
          {isSaving ? 'Saving...' : '💾 Save All Profile Data'}
        </button>
      </div>
    </div>
  );
}

export default SettingsPanel;
