import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  JOB_TITLES_DATABASE, 
  INDUSTRIES, 
  CERTIFICATIONS_DATABASE, 
  LANGUAGES, 
  EXPERIENCE_LEVELS 
} from '../data/job-search-data';
import { TagsDisplay, ScrollableMultiSelect } from './search-profiles';

export function SearchProfiles({ userId }: { userId: number }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [newName, setNewName] = useState('');
  
  // Job Title Multi-Select
  const [jobTitleSearch, setJobTitleSearch] = useState('');
  const [showJobTitleDropdown, setShowJobTitleDropdown] = useState(false);
  const [selectedJobTitles, setSelectedJobTitles] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Industries
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [excludedIndustries, setExcludedIndustries] = useState<string[]>([]);
  
  // Experience Levels (multi-select)
  const [selectedExperienceLevels, setSelectedExperienceLevels] = useState<string[]>([]);
  
  // Certifications
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [customCertification, setCustomCertification] = useState('');
  
  // Languages with proficiency levels
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [languageProficiencies, setLanguageProficiencies] = useState<Record<string, string>>({});

  // Location with distance
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'miles'>('km');
  const [searchRadius, setSearchRadius] = useState<number>(50);

  // Track if we're currently saving to prevent reload conflicts
  const isSavingRef = useRef(false);

  const loadProfiles = async () => {
    if (isSavingRef.current) return; // Don't reload while saving
    const result = await (window as any).electron.invoke('profiles:get-all', userId);
    if (result?.success) setProfiles(result.data);
  };

  useEffect(() => { loadProfiles(); }, [userId]);

  // When editing a profile, load existing values ONCE
  useEffect(() => {
    if (editing) {
      setSelectedJobTitles(editing.job_titles ? editing.job_titles.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setSelectedIndustries(editing.industry ? editing.industry.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setExcludedIndustries(editing.excluded_industries ? editing.excluded_industries.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setSelectedExperienceLevels(editing.experience_level ? editing.experience_level.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setSelectedCertifications(editing.certifications ? editing.certifications.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setSelectedLanguages(editing.languages ? editing.languages.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setSearchRadius(editing.search_radius || 50);
      setDistanceUnit(editing.distance_unit || 'km');
      // Load language proficiencies
      try {
        setLanguageProficiencies(editing.language_proficiencies ? JSON.parse(editing.language_proficiencies) : {});
      } catch (e) {
        setLanguageProficiencies({});
      }
    }
  }, [editing?.id]); // Only re-run when editing ID changes, not on every editing object change

  // Auto-save when selections change - WITHOUT reloading profiles
  useEffect(() => {
    if (editing) {
      const saveData = async () => {
        isSavingRef.current = true;
        const updated = {
          ...editing,
          job_titles: selectedJobTitles.join(', '),
          industry: selectedIndustries.join(', '),
          excluded_industries: excludedIndustries.join(', '),
          experience_level: selectedExperienceLevels.join(', '),
          certifications: selectedCertifications.join(', '),
          languages: selectedLanguages.join(', '),
          language_proficiencies: JSON.stringify(languageProficiencies),
          search_radius: searchRadius,
          distance_unit: distanceUnit
        };
        await (window as any).electron.invoke('profiles:update', updated);
        // Update the editing object locally instead of reloading
        setEditing(updated);
        isSavingRef.current = false;
      };
      const timeout = setTimeout(saveData, 500);
      return () => clearTimeout(timeout);
    }
  }, [selectedJobTitles, selectedIndustries, excludedIndustries, selectedExperienceLevels, selectedCertifications, selectedLanguages, languageProficiencies, searchRadius, distanceUnit]);

  // Close dropdown when clicking outside or mouse leaves
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowJobTitleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered job titles for search
  const filteredJobTitles = useMemo(() => {
    if (!jobTitleSearch.trim()) return JOB_TITLES_DATABASE.slice(0, 100);
    const search = jobTitleSearch.toLowerCase();
    return JOB_TITLES_DATABASE.filter(title => 
      title.toLowerCase().includes(search)
    ).slice(0, 100);
  }, [jobTitleSearch]);

  // Get relevant certifications based on selected job titles
  const relevantCertifications = useMemo(() => {
    const certs = new Set<string>();
    const jobTitlesLower = selectedJobTitles.map(t => t.toLowerCase());
    
    if (jobTitlesLower.some(t => t.includes('project') || t.includes('scrum') || t.includes('agile'))) {
      CERTIFICATIONS_DATABASE['project'].forEach(c => certs.add(c));
    }
    if (jobTitlesLower.some(t => t.includes('software') || t.includes('developer') || t.includes('engineer'))) {
      CERTIFICATIONS_DATABASE['software'].forEach(c => certs.add(c));
    }
    if (jobTitlesLower.some(t => t.includes('data') || t.includes('machine learning') || t.includes('ai'))) {
      CERTIFICATIONS_DATABASE['data'].forEach(c => certs.add(c));
    }
    if (jobTitlesLower.some(t => t.includes('security') || t.includes('cyber'))) {
      CERTIFICATIONS_DATABASE['security'].forEach(c => certs.add(c));
    }
    if (jobTitlesLower.some(t => t.includes('network') || t.includes('infrastructure'))) {
      CERTIFICATIONS_DATABASE['network'].forEach(c => certs.add(c));
    }
    if (jobTitlesLower.some(t => t.includes('design') || t.includes('ux') || t.includes('ui'))) {
      CERTIFICATIONS_DATABASE['design'].forEach(c => certs.add(c));
    }
    if (jobTitlesLower.some(t => t.includes('hr') || t.includes('recruiter') || t.includes('people'))) {
      CERTIFICATIONS_DATABASE['hr'].forEach(c => certs.add(c));
    }
    if (jobTitlesLower.some(t => t.includes('finance') || t.includes('account') || t.includes('cfo'))) {
      CERTIFICATIONS_DATABASE['finance'].forEach(c => certs.add(c));
    }
    if (jobTitlesLower.some(t => t.includes('marketing') || t.includes('seo') || t.includes('content'))) {
      CERTIFICATIONS_DATABASE['marketing'].forEach(c => certs.add(c));
    }
    if (jobTitlesLower.some(t => t.includes('sales') || t.includes('account executive'))) {
      CERTIFICATIONS_DATABASE['sales'].forEach(c => certs.add(c));
    }
    
    CERTIFICATIONS_DATABASE['general'].forEach(c => certs.add(c));
    return Array.from(certs);
  }, [selectedJobTitles]);

  const toggleSelection = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const addCustomCertification = () => {
    if (customCertification.trim() && !selectedCertifications.includes(customCertification.trim())) {
      setSelectedCertifications(prev => [...prev, customCertification.trim()]);
      setCustomCertification('');
    }
  };

  // Handle editing field changes without losing job titles
  const handleEditingFieldChange = (field: string, value: any) => {
    setEditing((prev: any) => ({ ...prev, [field]: value }));
  };

  // Styles
  const inputStyle: React.CSSProperties = { 
    width: '100%', 
    padding: '10px', 
    marginBottom: '10px', 
    border: '1px solid var(--border)', 
    borderRadius: '6px', 
    fontSize: '12px',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)'
  };
  
  const labelStyle: React.CSSProperties = { 
    display: 'block', 
    marginBottom: '5px', 
    fontSize: '11px', 
    fontWeight: 600, 
    color: 'var(--text-primary)' 
  };

  const groupStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '12px',
    border: '1px solid var(--border)'
  };

  const hintStyle: React.CSSProperties = {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    marginTop: '-5px',
    marginBottom: '8px',
    fontStyle: 'italic'
  };

  if (editing) {
    return (
      <div style={{ padding: '20px', background: 'var(--bg-primary)' }} tabIndex={-1}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>⚙️ Configure: {editing.profile_name}</h2>
          <button onClick={() => { loadProfiles(); setEditing(null); }} style={{ padding: '10px 25px', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>✓ Done</button>
        </div>

        {/* 3-Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {/* Column 1: Job Preferences */}
          <div>
            <div style={groupStyle}>
              <h4 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)' }}>💼 Job Preferences</h4>
              
              {/* Selected Job Titles Tags */}
              <TagsDisplay items={selectedJobTitles} onRemove={(title) => setSelectedJobTitles(prev => prev.filter(t => t !== title))} />
              
              {/* Job Title Search */}
              <label style={labelStyle}>
                Search & Add Job Titles 
                <span style={{ fontWeight: 'normal', fontSize: '10px', color: 'var(--text-tertiary)', marginLeft: '5px' }}>
                  (🌍 Feel free to enter titles in any language)
                </span>
              </label>
              <div 
                ref={dropdownRef}
                style={{ position: 'relative' }}
                onMouseLeave={() => setShowJobTitleDropdown(false)}
              >
                <input 
                  style={inputStyle} 
                  value={jobTitleSearch} 
                  onChange={e => { setJobTitleSearch(e.target.value); setShowJobTitleDropdown(true); }}
                  onFocus={() => setShowJobTitleDropdown(true)}
                  placeholder="Type to search or enter custom titles in any language..." 
                />
                {showJobTitleDropdown && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: 0, 
                      right: 0, 
                      maxHeight: '250px', 
                      overflowY: 'auto', 
                      background: 'var(--card-bg)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '6px', 
                      zIndex: 100,
                      boxShadow: 'var(--shadow-lg)'
                    }}
                    onMouseEnter={() => setShowJobTitleDropdown(true)}
                  >
                    {/* Custom title add option */}
                    {jobTitleSearch.trim() && !JOB_TITLES_DATABASE.some(t => t.toLowerCase() === jobTitleSearch.toLowerCase()) && (
                      <div 
                        onClick={() => {
                          const customTitle = jobTitleSearch.trim();
                          if (customTitle && !selectedJobTitles.includes(customTitle)) {
                            setSelectedJobTitles(prev => [...prev, customTitle]);
                          }
                          setJobTitleSearch('');
                        }}
                        style={{ 
                          padding: '10px 12px', 
                          cursor: 'pointer', 
                          fontSize: '12px',
                          borderBottom: '2px solid var(--primary)',
                          background: 'var(--info-light)',
                          color: 'var(--primary)',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>➕</span>
                        Add custom: "{jobTitleSearch.trim()}"
                        <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: 'auto' }}>(any language)</span>
                      </div>
                    )}
                    {filteredJobTitles.map(title => (
                      <div 
                        key={title}
                        onClick={() => {
                          if (!selectedJobTitles.includes(title)) {
                            setSelectedJobTitles(prev => [...prev, title]);
                          }
                          setJobTitleSearch('');
                        }}
                        style={{ 
                          padding: '8px 12px', 
                          cursor: 'pointer', 
                          fontSize: '12px',
                          borderBottom: '1px solid var(--border-light)',
                          background: selectedJobTitles.includes(title) ? 'var(--success-light)' : 'transparent',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {selectedJobTitles.includes(title) ? '✓ ' : ''}{title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p style={hintStyle}>
                💡 Can't find your job title? Simply type it above and click "Add custom". Works in any language! e.g., "Softwareentwickler", "Développeur", "開発者"
              </p>

              {/* Experience Levels */}
              <ScrollableMultiSelect 
                label="Experience Levels" 
                options={EXPERIENCE_LEVELS} 
                selected={selectedExperienceLevels} 
                setSelected={setSelectedExperienceLevels}
                maxHeight="100px"
              />
              
              {/* Location */}
              <label style={labelStyle}>Location</label>
              <input 
                style={inputStyle} 
                value={editing.location || ''} 
                onChange={e => handleEditingFieldChange('location', e.target.value)} 
                placeholder="e.g., Berlin, Germany, Europe..." 
              />
              <p style={hintStyle}>
                💡 Enter a country, state/province, or city. You can also type "Remote" for remote-only jobs.
              </p>

              {/* Distance Radius Slider */}
              <label style={labelStyle}>Search Radius: {searchRadius} {distanceUnit}</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <input 
                  type="range" 
                  min="5" 
                  max="500" 
                  step="5"
                  value={searchRadius}
                  onChange={e => setSearchRadius(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <select 
                  value={distanceUnit} 
                  onChange={e => setDistanceUnit(e.target.value as 'km' | 'miles')}
                  style={{ padding: '5px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '11px' }}
                >
                  <option value="km">Kilometers</option>
                  <option value="miles">Miles</option>
                </select>
              </div>
              <p style={hintStyle}>
                Distance from the location above where jobs will be searched.
              </p>
              
              {/* Remote/On-site */}
              <label style={labelStyle}>Work Type</label>
              <select style={inputStyle} value={editing.remote_preference || 'Any'} onChange={e => handleEditingFieldChange('remote_preference', e.target.value)}>
                <option value="Any">Any</option>
                <option value="Remote Only">Remote Only</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site Only">On-site Only</option>
              </select>

              {/* Salary Range */}
              <label style={labelStyle}>Minimum Salary (Optional)</label>
              <input style={inputStyle} type="number" value={editing.min_salary || ''} onChange={e => handleEditingFieldChange('min_salary', e.target.value)} placeholder="e.g., 50000" />
            </div>
          </div>

          {/* Column 2: Industries & Skills */}
          <div>
            <div style={groupStyle}>
              <h4 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)' }}>🏭 Industries</h4>
              
              {/* Industries - Include */}
              <ScrollableMultiSelect 
                label="Preferred Industries" 
                options={INDUSTRIES} 
                selected={selectedIndustries} 
                setSelected={setSelectedIndustries}
                maxHeight="140px"
              />
              
              {/* Industries - Exclude (Blacklist) */}
              <label style={{...labelStyle, color: 'var(--danger)'}}>❌ Exclude Industries (Blacklist)</label>
              <div style={{ 
                maxHeight: '120px', 
                overflowY: 'auto', 
                padding: '8px', 
                border: '1px solid var(--danger-light)', 
                borderRadius: '6px', 
                background: 'var(--danger-light)' 
              }}>
                {INDUSTRIES.map((ind: string) => (
                  <label key={ind} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '4px 0', 
                    cursor: 'pointer',
                    fontSize: '11px',
                    borderBottom: '1px solid var(--border-light)',
                    color: excludedIndustries.includes(ind) ? 'var(--danger)' : 'var(--text-primary)'
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
              <h4 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)' }}>🛠️ Skills & Education</h4>
              
              <label style={labelStyle}>Required Skills</label>
              <textarea style={{ ...inputStyle, height: '50px' }} value={editing.required_skills || ''} onChange={e => handleEditingFieldChange('required_skills', e.target.value)} placeholder="e.g., Python, JavaScript, SQL..." />
              
              <label style={labelStyle}>Education Level</label>
              <select style={inputStyle} value={editing.education_level || 'Any'} onChange={e => handleEditingFieldChange('education_level', e.target.value)}>
                <option value="Any">Any</option>
                <option value="High School">High School</option>
                <option value="Vocational">Vocational / Ausbildung</option>
                <option value="Bachelor's">Bachelor's Degree</option>
                <option value="Master's">Master's Degree</option>
                <option value="PhD">PhD / Doctorate</option>
              </select>

              {/* Language Skills with Proficiency Levels */}
              <label style={labelStyle}>🌍 Language Skills (with Proficiency)</label>
              <p style={{...hintStyle, marginTop: 0}}>
                💡 Add languages you speak and select your proficiency level (A1-C2). This helps bypass language requirements in job scoring.
              </p>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                padding: '8px', 
                border: '1px solid var(--border)', 
                borderRadius: '6px', 
                background: 'var(--card-bg)',
                marginBottom: '8px'
              }}>
                {/* Selected languages with proficiency */}
                {selectedLanguages.map((lang: string) => (
                  <div key={lang} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '8px', 
                    padding: '6px 8px', 
                    marginBottom: '4px',
                    background: 'var(--success-light)',
                    borderRadius: '6px',
                    border: '1px solid var(--success)'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      ✓ {lang}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <select
                        value={languageProficiencies[lang] || 'B1'}
                        onChange={(e) => setLanguageProficiencies(prev => ({ ...prev, [lang]: e.target.value }))}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          border: '1px solid var(--border)', 
                          background: 'var(--input-bg)', 
                          color: 'var(--text-primary)', 
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                      >
                        <option value="A1">A1 - Beginner</option>
                        <option value="A2">A2 - Elementary</option>
                        <option value="B1">B1 - Intermediate</option>
                        <option value="B2">B2 - Upper Intermediate</option>
                        <option value="C1">C1 - Advanced</option>
                        <option value="C2">C2 - Proficient/Native</option>
                      </select>
                      <button 
                        onClick={() => {
                          setSelectedLanguages(prev => prev.filter(l => l !== lang));
                          setLanguageProficiencies(prev => {
                            const newProf = { ...prev };
                            delete newProf[lang];
                            return newProf;
                          });
                        }}
                        style={{ 
                          padding: '2px 6px', 
                          background: 'var(--danger)', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Available languages to add */}
                <div style={{ marginTop: selectedLanguages.length > 0 ? '10px' : '0', borderTop: selectedLanguages.length > 0 ? '1px dashed var(--border)' : 'none', paddingTop: selectedLanguages.length > 0 ? '8px' : '0' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Click to add:</span>
                  {LANGUAGES.filter(lang => !selectedLanguages.includes(lang)).map((lang: string) => (
                    <button 
                      key={lang}
                      onClick={() => {
                        setSelectedLanguages(prev => [...prev, lang]);
                        setLanguageProficiencies(prev => ({ ...prev, [lang]: 'B1' }));
                      }}
                      style={{ 
                        padding: '4px 8px', 
                        margin: '2px',
                        fontSize: '11px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      + {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Certifications & Company */}
          <div>
            <div style={groupStyle}>
              <h4 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)' }}>📜 Certifications</h4>
              
              <TagsDisplay items={selectedCertifications} onRemove={(c) => setSelectedCertifications(prev => prev.filter(i => i !== c))} />
              
              <label style={labelStyle}>Relevant Certifications (based on job titles)</label>
              <div style={{ 
                maxHeight: '120px', 
                overflowY: 'auto', 
                padding: '8px', 
                border: '1px solid var(--border)', 
                borderRadius: '6px', 
                background: 'var(--card-bg)',
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
                    borderBottom: '1px solid var(--border-light)',
                    color: 'var(--text-primary)'
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
                <button onClick={addCustomCertification} style={{ padding: '8px 12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>+</button>
              </div>
            </div>

            <div style={groupStyle}>
              <h4 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)' }}>🏢 Company & Timing</h4>
              
              <label style={labelStyle}>Company Size</label>
              <select style={inputStyle} value={editing.company_size || 'Any'} onChange={e => handleEditingFieldChange('company_size', e.target.value)}>
                <option value="Any">Any</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501+">501+ employees</option>
              </select>

              <label style={labelStyle}>Company Rating</label>
              <select style={inputStyle} value={editing.company_rating || 'Any'} onChange={e => handleEditingFieldChange('company_rating', e.target.value)}>
                <option value="Any">Any</option>
                <option value="3.0+">3.0+ Stars</option>
                <option value="3.5+">3.5+ Stars</option>
                <option value="4.0+">4.0+ Stars</option>
              </select>
              
              <label style={labelStyle}>Posted Date (Within)</label>
              <select style={inputStyle} value={editing.posted_within || 'Any'} onChange={e => handleEditingFieldChange('posted_within', e.target.value)}>
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
              <input style={inputStyle} value={editing.company_name || ''} onChange={e => handleEditingFieldChange('company_name', e.target.value)} placeholder="e.g., Google, Microsoft..." />
              
              <label style={labelStyle}>Visa Sponsorship</label>
              <select style={inputStyle} value={editing.visa_sponsorship || 'Any'} onChange={e => handleEditingFieldChange('visa_sponsorship', e.target.value)}>
                <option value="Any">Any</option>
                <option value="Required">Required</option>
                <option value="Not Required">Not Required</option>
                <option value="Provided">Provided by Company</option>
              </select>
            </div>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '15px' }}>
          <button onClick={() => { loadProfiles(); setEditing(null); }} style={{ padding: '10px 30px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: 'var(--bg-primary)' }}>
      <h2 style={{ color: 'var(--text-primary)' }}>🔍 Search Profiles</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New Profile Name..." style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', flex: 1, background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
        <button onClick={async () => { 
          if(!newName) return; 
          await (window as any).electron.invoke('profiles:save', { userId, profileName: newName, is_active: 1 }); 
          setNewName(''); 
          loadProfiles(); 
        }} style={{ padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Create Profile</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
        {profiles.map(p => (
          <div key={p.id} style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px', background: p.is_speculative ? 'var(--warning-light)' : 'var(--card-bg)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '10px', color: 'var(--text-primary)' }}>{p.profile_name} {p.is_speculative && '🚀'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              📍 {p.location || 'Any'} | 🏢 {p.industry || 'Any'}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setEditing(p)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--primary)', color: 'var(--primary)', background: 'var(--card-bg)', cursor: 'pointer' }}>⚙️ Configure</button>
              <button onClick={async () => { await (window as any).electron.invoke('profiles:update', { ...p, is_active: p.is_active ? 0 : 1 }); loadProfiles(); }} style={{ padding: '8px 15px', borderRadius: '6px', border: 'none', background: p.is_active ? 'var(--success)' : 'var(--text-tertiary)', color: '#fff', cursor: 'pointer' }}>{p.is_active ? 'ON' : 'OFF'}</button>
              {!p.is_speculative && <button onClick={async () => { if(confirm("Delete this profile?")) { await (window as any).electron.invoke('profiles:delete', p.id); loadProfiles(); } }} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--danger)', color: 'var(--danger)', background: 'var(--card-bg)', cursor: 'pointer' }}>🗑️</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
