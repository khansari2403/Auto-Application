import { useState, useEffect, useMemo } from 'react';

// ==========================================
// LOCAL JOB TITLES DATABASE (Extensive List)
// ==========================================
const JOB_TITLES_DATABASE = [
  // Project Management
  'Project Manager', 'Assistant Project Manager', 'Senior Project Manager', 'Program Manager',
  'Project Coordinator', 'Project Director', 'Technical Project Manager', 'IT Project Manager',
  'Construction Project Manager', 'Agile Project Manager', 'Scrum Master', 'PMO Manager',
  
  // Software Development
  'Software Engineer', 'Senior Software Engineer', 'Lead Software Engineer', 'Principal Engineer',
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Mobile Developer',
  'iOS Developer', 'Android Developer', 'React Developer', 'Angular Developer', 'Vue.js Developer',
  'Node.js Developer', 'Python Developer', 'Java Developer', '.NET Developer', 'PHP Developer',
  'Ruby Developer', 'Go Developer', 'Rust Developer', 'C++ Developer', 'Embedded Developer',
  
  // Data & AI
  'Data Scientist', 'Data Analyst', 'Data Engineer', 'Machine Learning Engineer',
  'AI Engineer', 'Business Intelligence Analyst', 'Data Architect', 'Analytics Manager',
  'Deep Learning Engineer', 'NLP Engineer', 'Computer Vision Engineer', 'Research Scientist',
  
  // DevOps & Cloud
  'DevOps Engineer', 'Site Reliability Engineer', 'Cloud Engineer', 'Cloud Architect',
  'Platform Engineer', 'Infrastructure Engineer', 'Systems Administrator', 'Network Engineer',
  'Security Engineer', 'Cybersecurity Analyst', 'Kubernetes Engineer', 'AWS Architect',
  
  // Design
  'UX Designer', 'UI Designer', 'Product Designer', 'UX Researcher', 'Graphic Designer',
  'Visual Designer', 'Interaction Designer', 'Design Lead', 'Creative Director',
  'Motion Designer', 'Brand Designer', 'Web Designer',
  
  // Product & Business
  'Product Manager', 'Senior Product Manager', 'Product Owner', 'Product Director',
  'Business Analyst', 'Systems Analyst', 'Requirements Analyst', 'Technical Analyst',
  'Management Consultant', 'Strategy Consultant', 'Business Development Manager',
  
  // QA & Testing
  'QA Engineer', 'QA Analyst', 'Test Engineer', 'Automation Engineer', 'SDET',
  'Quality Manager', 'Test Lead', 'Performance Engineer',
  
  // Marketing & Sales
  'Marketing Manager', 'Digital Marketing Manager', 'Content Manager', 'SEO Specialist',
  'Social Media Manager', 'Brand Manager', 'Marketing Director', 'Growth Manager',
  'Sales Representative', 'Account Executive', 'Sales Manager', 'Business Development Rep',
  'Customer Success Manager', 'Account Manager', 'Sales Director',
  
  // HR & People
  'HR Manager', 'HR Business Partner', 'Recruiter', 'Talent Acquisition Specialist',
  'People Operations Manager', 'HR Director', 'Compensation Analyst', 'L&D Manager',
  
  // Finance & Accounting
  'Financial Analyst', 'Accountant', 'Senior Accountant', 'Controller', 'CFO',
  'Tax Accountant', 'Auditor', 'FP&A Analyst', 'Treasury Analyst', 'Investment Analyst',
  
  // Operations & Management
  'Operations Manager', 'Operations Director', 'COO', 'General Manager', 'Office Manager',
  'Facilities Manager', 'Supply Chain Manager', 'Logistics Manager', 'Procurement Manager',
  
  // Legal
  'Legal Counsel', 'Corporate Lawyer', 'Compliance Officer', 'Paralegal', 'Contract Manager',
  
  // Healthcare
  'Healthcare Administrator', 'Clinical Manager', 'Medical Director', 'Nurse Manager',
  'Health Informatics Specialist', 'Clinical Research Coordinator',
  
  // Other
  'Technical Writer', 'Documentation Specialist', 'Executive Assistant', 'Administrative Assistant',
  'Office Administrator', 'Receptionist', 'Customer Service Representative', 'Support Specialist'
];

// ==========================================
// INDUSTRIES DATABASE (20+)
// ==========================================
const INDUSTRIES = [
  'Technology/IT',
  'Healthcare/Medical',
  'Finance/Banking',
  'Insurance',
  'Education',
  'Manufacturing',
  'Retail/E-commerce',
  'Telecommunications',
  'Energy/Utilities',
  'Real Estate',
  'Construction',
  'Transportation/Logistics',
  'Media/Entertainment',
  'Hospitality/Tourism',
  'Legal Services',
  'Consulting',
  'Government/Public Sector',
  'Non-Profit/NGO',
  'Automotive',
  'Aerospace/Defense',
  'Pharmaceutical',
  'Agriculture',
  'Food & Beverage'
];

// ==========================================
// CERTIFICATIONS DATABASE (by job category)
// ==========================================
const CERTIFICATIONS_DATABASE: Record<string, string[]> = {
  'project': ['PMP', 'PRINCE2', 'CAPM', 'CSM', 'PMI-ACP', 'Agile Certified Practitioner', 'Six Sigma Green Belt', 'Six Sigma Black Belt', 'Lean Six Sigma'],
  'software': ['AWS Certified Developer', 'AWS Solutions Architect', 'Azure Developer', 'Google Cloud Professional', 'Kubernetes Administrator (CKA)', 'Docker Certified Associate'],
  'data': ['AWS Machine Learning', 'Google Data Engineer', 'Azure Data Scientist', 'Databricks Certified', 'Tableau Desktop Specialist', 'Power BI Certification'],
  'security': ['CISSP', 'CISM', 'CEH', 'CompTIA Security+', 'OSCP', 'CISA', 'GSEC'],
  'network': ['CCNA', 'CCNP', 'CompTIA Network+', 'JNCIA', 'AWS Networking'],
  'design': ['Google UX Design', 'Adobe Certified Expert', 'HFI CUA', 'Nielsen Norman Group UX'],
  'hr': ['SHRM-CP', 'SHRM-SCP', 'PHR', 'SPHR', 'CIPD'],
  'finance': ['CPA', 'CFA', 'CMA', 'FRM', 'CIA', 'CFP'],
  'marketing': ['Google Ads Certification', 'HubSpot Certification', 'Facebook Blueprint', 'Google Analytics'],
  'sales': ['Salesforce Certified', 'HubSpot Sales', 'Sandler Training'],
  'general': ['ITIL Foundation', 'Scrum Master', 'Product Owner', 'Change Management']
};

const LANGUAGES = [
  'English', 'German', 'Spanish', 'French', 'Mandarin Chinese', 'Japanese', 
  'Russian', 'Italian', 'Portuguese', 'Arabic', 'Dutch', 'Korean', 
  'Polish', 'Turkish', 'Swedish', 'Hindi'
];

const EXPERIENCE_LEVELS = [
  'Entry-Level/Junior',
  'Mid-Level',
  'Senior',
  'Lead',
  'Manager',
  'Director',
  'Executive/C-Level'
];

export function SearchProfiles({ userId }: { userId: number }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [newName, setNewName] = useState('');
  
  // Job Title Multi-Select
  const [jobTitleSearch, setJobTitleSearch] = useState('');
  const [showJobTitleDropdown, setShowJobTitleDropdown] = useState(false);
  const [selectedJobTitles, setSelectedJobTitles] = useState<string[]>([]);
  
  // Industries
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [excludedIndustries, setExcludedIndustries] = useState<string[]>([]);
  
  // Experience Levels (multi-select)
  const [selectedExperienceLevels, setSelectedExperienceLevels] = useState<string[]>([]);
  
  // Certifications
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [customCertification, setCustomCertification] = useState('');

  const loadProfiles = async () => {
    const result = await (window as any).electron.invoke('profiles:get-all', userId);
    if (result?.success) setProfiles(result.data);
  };

  useEffect(() => { loadProfiles(); }, [userId]);

  // When editing a profile, load existing values
  useEffect(() => {
    if (editing) {
      setSelectedJobTitles(editing.job_titles ? editing.job_titles.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setSelectedIndustries(editing.industry ? editing.industry.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setExcludedIndustries(editing.excluded_industries ? editing.excluded_industries.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setSelectedExperienceLevels(editing.experience_levels ? editing.experience_levels.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setSelectedCertifications(editing.certifications ? editing.certifications.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    }
  }, [editing]);

  // Get relevant certifications based on selected job titles
  const relevantCertifications = useMemo(() => {
    const certs = new Set<string>();
    selectedJobTitles.forEach(title => {
      const lowerTitle = title.toLowerCase();
      Object.entries(CERTIFICATIONS_DATABASE).forEach(([key, certList]) => {
        if (lowerTitle.includes(key) || 
            (key === 'project' && lowerTitle.includes('manager')) ||
            (key === 'software' && (lowerTitle.includes('developer') || lowerTitle.includes('engineer'))) ||
            (key === 'data' && (lowerTitle.includes('data') || lowerTitle.includes('analyst'))) ||
            (key === 'security' && lowerTitle.includes('security')) ||
            (key === 'hr' && lowerTitle.includes('hr')) ||
            (key === 'finance' && (lowerTitle.includes('finance') || lowerTitle.includes('account'))) ||
            (key === 'marketing' && lowerTitle.includes('marketing')) ||
            (key === 'sales' && lowerTitle.includes('sales'))) {
          certList.forEach(c => certs.add(c));
        }
      });
    });
    // Always add general certs
    CERTIFICATIONS_DATABASE.general.forEach(c => certs.add(c));
    return Array.from(certs);
  }, [selectedJobTitles]);

  // Filter job titles based on search
  const filteredJobTitles = useMemo(() => {
    if (!jobTitleSearch) return JOB_TITLES_DATABASE.slice(0, 20);
    return JOB_TITLES_DATABASE.filter(t => 
      t.toLowerCase().includes(jobTitleSearch.toLowerCase())
    ).slice(0, 15);
  }, [jobTitleSearch]);

  const handleSave = async () => {
    const profileData = {
      ...editing,
      job_titles: selectedJobTitles.join(', '),
      industry: selectedIndustries.join(', '),
      excluded_industries: excludedIndustries.join(', '),
      experience_levels: selectedExperienceLevels.join(', '),
      certifications: selectedCertifications.join(', '),
    };
    await (window as any).electron.invoke('profiles:update', profileData);
    setEditing(null);
    loadProfiles();
    alert("Search Profile Saved!");
  };

  const toggleSelection = (list: string[], setList: Function, value: string) => {
    if (list.includes(value)) {
      setList(list.filter(i => i !== value));
    } else {
      setList([...list, value]);
    }
  };

  const addCustomJobTitle = () => {
    if (jobTitleSearch && !selectedJobTitles.includes(jobTitleSearch)) {
      setSelectedJobTitles([...selectedJobTitles, jobTitleSearch]);
      setJobTitleSearch('');
    }
  };

  const addCustomCertification = () => {
    if (customCertification && !selectedCertifications.includes(customCertification)) {
      setSelectedCertifications([...selectedCertifications, customCertification]);
      setCustomCertification('');
    }
  };

  const inputStyle = { width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '12px' };
  const labelStyle: React.CSSProperties = { display: 'block', fontWeight: 'bold', marginBottom: '4px', color: '#0077b5', fontSize: '11px' };
  const groupStyle = { background: '#f9f9f9', padding: '12px', borderRadius: '10px', marginBottom: '12px', border: '1px solid #eee' };

  // Multi-Select Scrollable Component
  const ScrollableMultiSelect = ({ label, options, selected, setSelected, maxHeight = '120px' }: any) => (
    <div style={{ marginBottom: '10px' }}>
      <label style={labelStyle}>{label} ({selected.length} selected)</label>
      <div style={{ 
        maxHeight, 
        overflowY: 'auto', 
        padding: '8px', 
        border: '1px solid #ddd', 
        borderRadius: '6px', 
        background: '#fff' 
      }}>
        {options.map((opt: string) => (
          <label key={opt} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '4px 0', 
            cursor: 'pointer',
            fontSize: '11px',
            borderBottom: '1px solid #f0f0f0'
          }}>
            <input 
              type="checkbox" 
              checked={selected.includes(opt)} 
              onChange={() => toggleSelection(selected, setSelected, opt)}
              style={{ cursor: 'pointer' }}
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );

  // Selected Tags Display
  const TagsDisplay = ({ items, onRemove }: { items: string[], onRemove: (item: string) => void }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
      {items.map(item => (
        <span key={item} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          background: '#e3f2fd',
          color: '#0077b5',
          borderRadius: '12px',
          fontSize: '10px'
        }}>
          {item}
          <button onClick={() => onRemove(item)} style={{ 
            border: 'none', 
            background: 'none', 
            cursor: 'pointer', 
            color: '#0077b5',
            padding: 0,
            fontSize: '12px'
          }}>×</button>
        </span>
      ))}
    </div>
  );

  if (editing) {
    return (
      <div style={{ padding: '20px', background: '#fff', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>⚙️ {editing.is_speculative ? '🚀 Speculative Application Settings' : `Criteria: ${editing.profile_name}`}</h3>
          <button onClick={handleSave} style={{ padding: '10px 30px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>✅ Save Profile</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          {/* Column 1: Target & Core */}
          <div>
            <div style={groupStyle}>
              <h4 style={{ marginTop: 0, marginBottom: '12px' }}>🎯 Target & Core</h4>
              
              {/* Job Titles Multi-Select */}
              <label style={labelStyle}>Job Titles (Multiple Selection)</label>
              <TagsDisplay items={selectedJobTitles} onRemove={(t) => setSelectedJobTitles(selectedJobTitles.filter(i => i !== t))} />
              <div style={{ position: 'relative' }}>
                <input 
                  style={inputStyle}
                  value={jobTitleSearch}
                  onChange={(e) => { setJobTitleSearch(e.target.value); setShowJobTitleDropdown(true); }}
                  onFocus={() => setShowJobTitleDropdown(true)}
                  placeholder="Search or type custom job title..."
                />
                <button 
                  onClick={addCustomJobTitle}
                  style={{ position: 'absolute', right: '5px', top: '5px', padding: '4px 8px', fontSize: '10px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  + Add
                </button>
                {showJobTitleDropdown && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    background: '#fff', 
                    border: '1px solid #ccc', 
                    borderRadius: '6px', 
                    zIndex: 100, 
                    maxHeight: '200px', 
                    overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {filteredJobTitles.map(title => (
                      <div 
                        key={title}
                        onClick={() => {
                          if (!selectedJobTitles.includes(title)) {
                            setSelectedJobTitles([...selectedJobTitles, title]);
                          }
                          setJobTitleSearch('');
                        }}
                        style={{ 
                          padding: '8px 12px', 
                          cursor: 'pointer', 
                          fontSize: '12px',
                          borderBottom: '1px solid #f0f0f0',
                          background: selectedJobTitles.includes(title) ? '#e3f2fd' : 'transparent'
                        }}
                      >
                        {title} {selectedJobTitles.includes(title) && '✓'}
                      </div>
                    ))}
                    <div 
                      onClick={() => setShowJobTitleDropdown(false)}
                      style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: '#666', cursor: 'pointer', background: '#f5f5f5' }}
                    >
                      Close ▲
                    </div>
                  </div>
                )}
              </div>

              <label style={labelStyle}>Location</label>
              <input style={inputStyle} value={editing.location || 'Any'} onChange={e => setEditing({...editing, location: e.target.value})} />
              
              <label style={labelStyle}>Job Type</label>
              <select style={inputStyle} value={editing.job_type || 'Any'} onChange={e => setEditing({...editing, job_type: e.target.value})}>
                <option value="Any">Any</option>
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
                <option value="Contract">Contract</option>
              </select>

              {/* Experience Level Multi-Select */}
              <ScrollableMultiSelect 
                label="Experience Level (Multiple)" 
                options={EXPERIENCE_LEVELS} 
                selected={selectedExperienceLevels} 
                setSelected={setSelectedExperienceLevels}
                maxHeight="100px"
              />
            </div>
          </div>

          {/* Column 2: Industries & Skills */}
          <div>
            <div style={groupStyle}>
              <h4 style={{ marginTop: 0, marginBottom: '12px' }}>🏭 Industries</h4>
              
              {/* Industries - Include */}
              <ScrollableMultiSelect 
                label="Preferred Industries" 
                options={INDUSTRIES} 
                selected={selectedIndustries} 
                setSelected={setSelectedIndustries}
                maxHeight="140px"
              />
              
              {/* Industries - Exclude (Blacklist) */}
              <label style={{...labelStyle, color: '#f44336'}}>❌ Exclude Industries (Blacklist)</label>
              <div style={{ 
                maxHeight: '120px', 
                overflowY: 'auto', 
                padding: '8px', 
                border: '1px solid #ffcdd2', 
                borderRadius: '6px', 
                background: '#fff8f8' 
              }}>
                {INDUSTRIES.map((ind: string) => (
                  <label key={ind} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '4px 0', 
                    cursor: 'pointer',
                    fontSize: '11px',
                    borderBottom: '1px solid #f0f0f0',
                    color: excludedIndustries.includes(ind) ? '#f44336' : 'inherit'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={excludedIndustries.includes(ind)} 
                      onChange={() => toggleSelection(excludedIndustries, setExcludedIndustries, ind)}
                      style={{ cursor: 'pointer' }}
                    />
                    {ind}
                  </label>
                ))}
              </div>
            </div>

            <div style={groupStyle}>
              <h4 style={{ marginTop: 0, marginBottom: '12px' }}>🛠️ Skills & Education</h4>
              
              <label style={labelStyle}>Required Skills</label>
              <textarea style={{ ...inputStyle, height: '50px' }} value={editing.required_skills || ''} onChange={e => setEditing({...editing, required_skills: e.target.value})} placeholder="e.g., Python, JavaScript, SQL..." />
              
              <label style={labelStyle}>Education Level</label>
              <select style={inputStyle} value={editing.education_level || 'Any'} onChange={e => setEditing({...editing, education_level: e.target.value})}>
                <option value="Any">Any</option>
                <option value="High School">High School</option>
                <option value="Vocational">Vocational / Ausbildung</option>
                <option value="Bachelor's">Bachelor's Degree</option>
                <option value="Master's">Master's Degree</option>
                <option value="PhD">PhD / Doctorate</option>
              </select>

              <ScrollableMultiSelect 
                label="Languages" 
                options={LANGUAGES} 
                selected={editing.languages ? editing.languages.split(',').map((s: string) => s.trim()) : []} 
                setSelected={(langs: string[]) => setEditing({...editing, languages: langs.join(', ')})}
                maxHeight="80px"
              />
            </div>
          </div>

          {/* Column 3: Certifications & Company */}
          <div>
            <div style={groupStyle}>
              <h4 style={{ marginTop: 0, marginBottom: '12px' }}>📜 Certifications</h4>
              
              <TagsDisplay items={selectedCertifications} onRemove={(c) => setSelectedCertifications(selectedCertifications.filter(i => i !== c))} />
              
              <label style={labelStyle}>Relevant Certifications (based on job titles)</label>
              <div style={{ 
                maxHeight: '120px', 
                overflowY: 'auto', 
                padding: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '6px', 
                background: '#fff',
                marginBottom: '8px'
              }}>
                {relevantCertifications.map((cert: string) => (
                  <label key={cert} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '4px 0', 
                    cursor: 'pointer',
                    fontSize: '11px',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={selectedCertifications.includes(cert)} 
                      onChange={() => toggleSelection(selectedCertifications, setSelectedCertifications, cert)}
                    />
                    {cert}
                  </label>
                ))}
              </div>

              <label style={labelStyle}>Add Custom Certification</label>
              <div style={{ display: 'flex', gap: '5px' }}>
                <input 
                  style={{...inputStyle, marginBottom: 0, flex: 1}} 
                  value={customCertification} 
                  onChange={e => setCustomCertification(e.target.value)}
                  placeholder="Type custom certification..."
                />
                <button onClick={addCustomCertification} style={{ padding: '8px 12px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>+</button>
              </div>
            </div>

            <div style={groupStyle}>
              <h4 style={{ marginTop: 0, marginBottom: '12px' }}>🏢 Company & Timing</h4>
              
              <label style={labelStyle}>Company Size</label>
              <select style={inputStyle} value={editing.company_size || 'Any'} onChange={e => setEditing({...editing, company_size: e.target.value})}>
                <option value="Any">Any</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501+">501+ employees</option>
              </select>

              <label style={labelStyle}>Company Rating</label>
              <select style={inputStyle} value={editing.company_rating || 'Any'} onChange={e => setEditing({...editing, company_rating: e.target.value})}>
                <option value="Any">Any</option>
                <option value="3.0+">3.0+ Stars</option>
                <option value="3.5+">3.5+ Stars</option>
                <option value="4.0+">4.0+ Stars</option>
              </select>
              
              <label style={labelStyle}>Posted Date (Within)</label>
              <select style={inputStyle} value={editing.posted_within || 'Any'} onChange={e => setEditing({...editing, posted_within: e.target.value})}>
                <option value="Any">Any Time</option>
                <option value="4h">Last 4 Hours</option>
                <option value="8h">Last 8 Hours</option>
                <option value="12h">Last 12 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="3d">Last 3 Days</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>

              <label style={labelStyle}>Target Company Name (Optional)</label>
              <input style={inputStyle} value={editing.company_name || ''} onChange={e => setEditing({...editing, company_name: e.target.value})} placeholder="e.g., Google, Microsoft..." />
              
              <label style={labelStyle}>Visa Sponsorship</label>
              <select style={inputStyle} value={editing.visa_sponsorship || 'Any'} onChange={e => setEditing({...editing, visa_sponsorship: e.target.value})}>
                <option value="Any">Any</option>
                <option value="Required">Required</option>
                <option value="Not Required">Not Required</option>
                <option value="Provided">Provided by Company</option>
              </select>
            </div>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '15px' }}>
          <button onClick={() => setEditing(null)} style={{ padding: '10px 30px', background: '#ccc', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>🔍 Search Profiles</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New Profile Name..." style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', flex: 1 }} />
        <button onClick={async () => { 
          if(!newName) return; 
          await (window as any).electron.invoke('profiles:save', { userId, profileName: newName, is_active: 1 }); 
          setNewName(''); 
          loadProfiles(); 
        }} style={{ padding: '10px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Create Profile</button>
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
