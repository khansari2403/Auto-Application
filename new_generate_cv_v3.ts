export function generateCVHTML(
  content: string,
  userProfile: any,
  job: any,
  isGerman: boolean,
  targetLanguage?: string,
  cvStylePersona?: string
): string {
  const lang = (targetLanguage || (isGerman ? 'GERMAN' : 'ENGLISH')).toUpperCase();
  const persona = (cvStylePersona || 'Classic').toLowerCase();
  const isMimicPersona = persona.includes('mimic'); // internal flag for "Use my manually input profile" style

  // 1. Parsing JSON content from AI (New Deterministic Engine)
  let rewritten: { summary?: string; experiences?: Record<string, string>; educations?: Record<string, string> } = {};
  try {
     const jsonClean = content.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
     if (jsonClean.startsWith('{')) {
       rewritten = JSON.parse(jsonClean);
     }
  } catch (e) {
     console.error('Failed to parse CV JSON content:', e);
  }

  // Multi-language labels
  const labels: Record<string, Record<string, string>> = {
    GERMAN: { summary: 'Berufsprofil', experience: 'Berufserfahrung', education: 'Ausbildung', skills: 'Kenntnisse', certifications: 'Zertifizierungen', languages: 'Sprachkenntnisse', present: 'Heute' },
    ENGLISH: { summary: 'Professional Summary', experience: 'Work Experience', education: 'Education', skills: 'Skills', certifications: 'Certifications', languages: 'Languages', present: 'Present' },
    FRENCH: { summary: 'Profil Professionnel', experience: 'Expérience Professionnelle', education: 'Formation', skills: 'Compétences', certifications: 'Certifications', languages: 'Langues', present: 'Présent' },
    SPANISH: { summary: 'Perfil Profesional', experience: 'Experiencia Laboral', education: 'Educación', skills: 'Habilidades', certifications: 'Certificaciones', languages: 'Idiomas', present: 'Presente' },
    ITALIAN: { summary: 'Profilo Professionale', experience: 'Esperienza Lavorativa', education: 'Istruzione', skills: 'Competenze', certifications: 'Certificazioni', languages: 'Lingue', present: 'Presente' },
    DUTCH: { summary: 'Professioneel Profiel', experience: 'Werkervaring', education: 'Opleiding', skills: 'Vaardigheden', certifications: 'Certificeringen', languages: 'Talen', present: 'Heden' }
  };
  const l = labels[lang] || labels.ENGLISH;

  const sidebarLabels: Record<string, { contact: string; extras: string; certs: string }> = {
    GERMAN: { contact: 'Kontakt', extras: 'Weitere Qualifikationen', certs: 'Zertifizierungen' },
    ENGLISH: { contact: 'Contact', extras: 'Additional Qualifications', certs: 'Certifications' },
    FRENCH: { contact: 'Contact', extras: 'Compétences', certs: 'Certifications' },
    SPANISH: { contact: 'Contacto', extras: 'Competencias', certs: 'Certificaciones' },
    ITALIAN: { contact: 'Contatti', extras: 'Competenze', certs: 'Certificazioni' },
    DUTCH: { contact: 'Contact', extras: 'Vaardigheden', certs: 'Certificeringen' }
  };
  const sidebar = sidebarLabels[lang] || sidebarLabels.ENGLISH;
  
  const htmlLangMap: Record<string, string> = { GERMAN: 'de', ENGLISH: 'en', FRENCH: 'fr', SPANISH: 'es', ITALIAN: 'it', DUTCH: 'nl' };
  const htmlLang = htmlLangMap[lang] || 'en';

  const formatContent = (text: string): string => text ? text.replace(/\n/g, '<br>') : '';

  // Clean date strings: replace ] with - if present
  const cleanDate = (d: string | number | undefined): string => {
    if (!d) return '';
    return String(d).replace(/\]/g, '-');
  };

  // --- Sorting Helper ---
  const sortDesc = (a: any, b: any) => {
    // 1. Priority: Currently Working Here (boolean)
    if (a.current && !b.current) return -1;
    if (!a.current && b.current) return 1;

    const getYear = (d: string | number) => {
      if (!d) return 0;
      // Match 4 digits (19xx or 20xx) to avoid matching days/months
      const m = String(d).match(/(?:19|20)\d{2}/);
      return m ? parseInt(m[0], 10) : 0;
    };
    // Enhanced present detection including "Seit", "Since", "Ongoing"
    const isPresent = (d: string | number) => /present|heute|now|current|bis heute|seit|since|ongoing|laufend/i.test(String(d || ''));
    
    // Compare end dates first
    const endA = a.endDate || a.end_date || a.to || a.end || a.endYear || a.end_year || '';
    const endB = b.endDate || b.end_date || b.to || b.end || b.endYear || b.end_year || '';
    
    const presentA = isPresent(endA);
    const presentB = isPresent(endB);

    if (presentA && !presentB) return -1; // A is present (newer), comes first
    if (!presentA && presentB) return 1;  // B is present (newer), comes first
    
    // If both are present (either by boolean or string), sort by Start Date Descending
    if ((a.current && b.current) || (presentA && presentB)) {
        const startA = a.startDate || a.start_date || a.from || a.start || a.startYear || a.start_year || '';
        const startB = b.startDate || b.start_date || b.from || b.start || b.startYear || b.start_year || '';
        return getYear(startB) - getYear(startA);
    }
    
    const yearEndA = getYear(endA);
    const yearEndB = getYear(endB);
    
    if (yearEndA !== yearEndB) return yearEndB - yearEndA; // Higher year (newer) first
    
    // If end years same, compare start years
    const startA = a.startDate || a.start_date || a.from || a.start || a.startYear || a.start_year || '';
    const startB = b.startDate || b.start_date || b.from || b.start || b.startYear || b.start_year || '';
    
    return getYear(startB) - getYear(startA);
  };

  // Deterministic Renderers
  const renderExperiences = () => {
    let exps = userProfile?.experiences || [];
    if (!Array.isArray(exps) || exps.length === 0) return '';

    // Create a copy and sort it (preserve indices for mapping rewritten content if possible? 
    // Wait, rewritten keys are indices 0, 1, 2... based on ORIGINAL order sent to LLM.
    // The LLM was sent the data in `formatExperiencesForPrompt`.
    // If that function sends them in the original order, then key "0" corresponds to original index 0.
    // So we must attach the original index to the item BEFORE sorting, so we can look up the correct rewrite.
    const expsWithIdx = exps.map((e: any, i: number) => ({ ...e, _originalIndex: i }));
    expsWithIdx.sort(sortDesc);
    
    return expsWithIdx.map((exp: any, idx: number) => {
        // Use rewritten description if available using ORIGINAL index
        const originalIdx = exp._originalIndex;
        const rawDesc = rewritten.experiences?.[String(originalIdx)] || exp.description || exp.details || '';
        const desc = rawDesc.replace(/^<ul>/, '<ul class="exp-list">'); // add class for styling if needed

        const start = cleanDate(exp.startDate || exp.start_date || exp.from || exp.start || '');
        const end = cleanDate(exp.endDate || exp.end_date || exp.to || exp.end || '');
        const dateRange = (start) + (end ? ` - ${end}` : '');
        const finalDate = dateRange.replace(/Present/i, l.present).replace(/Heute/i, l.present);
        
        const title = exp.title || exp.role || exp.position || 'N/A';
        const company = exp.company || exp.employer || 'N/A';
        const location = exp.location || exp.city || '';

        return `
        <div class="exp-entry${idx > 0 ? ' exp-entry--spaced' : ''}">
           <div class="exp-dates">${finalDate}</div>
           <div class="exp-title-company">
             <span class="exp-role">${title}</span>
             <span class="exp-company"> | ${company}</span>
           </div>
           ${location ? `<div class="exp-location">${location}</div>` : ''}
           <div class="exp-description">${formatContent(desc)}</div>
        </div>`;
    }).join('');
  };

  const renderEducations = () => {
    let edus = userProfile?.educations || [];
    if (!Array.isArray(edus) || edus.length === 0) return '';

    const edusWithIdx = edus.map((e: any, i: number) => ({ ...e, _originalIndex: i }));
    edusWithIdx.sort(sortDesc);

    return edusWithIdx.map((edu: any, idx: number) => {
        const originalIdx = edu._originalIndex;
        const rawDesc = rewritten.educations?.[String(originalIdx)] || edu.details || edu.description || '';
        const desc = rawDesc;
        
        const start = cleanDate(edu.startYear || edu.start_year || edu.from || edu.start || '');
        const end = cleanDate(edu.endYear || edu.end_year || edu.to || edu.end || '');
        const dateRange = (start) + (end ? ` - ${end}` : '');
        const finalDate = dateRange.replace(/Present/i, l.present).replace(/Heute/i, l.present);
        
        const degree = edu.degree || edu.title || edu.program || 'N/A';
        const school = edu.school || edu.institution || edu.university || 'N/A';
        const location = edu.location || edu.city || '';

        return `
        <div class="exp-entry${idx > 0 ? ' exp-entry--spaced' : ''}">
           <div class="exp-dates">${finalDate}</div>
           <div class="exp-title-company">
             <span class="exp-role">${degree}</span>
             <span class="exp-company"> | ${school}</span>
           </div>
           ${location ? `<div class="exp-location">${location}</div>` : ''}
           <div class="exp-description">${formatContent(desc)}</div>
        </div>`;
    }).join('');
  };

  const summaryText = rewritten.summary || userProfile?.summary || '';
  
  // =========================================================
  // LAYOUT 1: MIMIC / UPLOADED CV (Two Columns)
  // =========================================================
  if (isMimicPersona) {
    const leftSkills = userProfile?.skills || [];
    const leftCerts = userProfile?.licenses || [];
    
    // Parse languages (can be CSV string OR JSON array)
    let leftLangs: any[] = [];
    const rawLangs = userProfile?.languages;
    if (Array.isArray(rawLangs)) {
        leftLangs = rawLangs;
    } else if (typeof rawLangs === 'string') {
        try {
            leftLangs = JSON.parse(rawLangs);
            // If it's just an array of strings ["Eng", "Ger"], use map to normalize
            if (Array.isArray(leftLangs) && typeof leftLangs[0] === 'string') {
                leftLangs = leftLangs.map(l => ({ language: l, level: '' }));
            }
        } catch {
            // CSV fallback
            leftLangs = rawLangs.split(',').map(s => {
                const match = s.trim().match(/^(.*?)\s*\((.*?)\)$/);
                if (match) return { language: match[1], level: match[2] };
                return { language: s.trim(), level: '' };
            }).filter(x => x.language);
        }
    }

    const photo = userProfile?.photo || ''; // Base64 or URL
    
    // Helper to extract strings from objects if needed
    const getVal = (x: any) => typeof x === 'string' ? x : (x.name || x.title || JSON.stringify(x));
    const getLangVal = (x: any) => {
        if (typeof x === 'string') return x;
        if (x.language) return x.level ? `${x.language} (${x.level})` : x.language;
        return x.name || x.title || JSON.stringify(x);
    };

    const skillsHTML = Array.isArray(leftSkills) && leftSkills.length
      ? `<div class="sidebar-section"><div class="sidebar-title">${sidebar.extras}</div><div class="tag-list">${leftSkills.map(s => `<span class="tag">${getVal(s)}</span>`).join('')}</div></div>`
      : '';
      
    const certsHTML = Array.isArray(leftCerts) && leftCerts.length
      ? `<div class="sidebar-section"><div class="sidebar-title">${sidebar.certs}</div><div class="tag-list">${leftCerts.map(c => `<span class="tag tag--cert">${getVal(c)}</span>`).join('')}</div></div>`
      : '';
      
    const langsHTML = Array.isArray(leftLangs) && leftLangs.length
      ? `<div class="sidebar-section"><div class="sidebar-title">${l.languages.toUpperCase()}</div><ul class="list">${leftLangs.map(ln => `<li>${getLangVal(ln)}</li>`).join('')}</ul></div>`
      : '';

    // Build Main Sections
    let mainSectionsHtml = '';
    
    if (summaryText) {
        mainSectionsHtml += `
        <div class="main-section">
            <div class="main-section-title">${l.summary}</div>
            <div class="main-content">${formatContent(summaryText)}</div>
        </div>`;
    }
    
    const expHtml = renderExperiences();
    if (expHtml) {
        mainSectionsHtml += `
        <div class="main-section">
            <div class="main-section-title">${l.experience}</div>
            <div class="main-content">${expHtml}</div>
        </div>`;
    }
    
    const eduHtml = renderEducations();
    if (eduHtml) {
        mainSectionsHtml += `
        <div class="main-section">
            <div class="main-section-title">${l.education}</div>
            <div class="main-content">${eduHtml}</div>
        </div>`;
    }

    // Photo styling
    const photoStyle = `
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      margin: 0 auto 20px auto;
      display: block;
      border: 3px solid #e0e0e0;
    `;

    return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <title>${lang === 'GERMAN' ? 'Lebenslauf' : 'CV'} - ${userProfile?.name || 'Bewerber'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 30px 40px; background: #fff; }
    .cv-grid { display: grid; grid-template-columns: 30% 70%; gap: 24px; }
    .sidebar { border-right: 2px solid #e0e0e0; padding-right: 18px; display: flex; flex-direction: column; align-items: stretch; }
    .sidebar-header { text-align: center; margin-bottom: 24px; }
    .sidebar-name { font-size: 20px; font-weight: 700; color: #0077b5; margin-bottom: 4px; }
    .sidebar-title-main { font-size: 13px; color: #555; }
    .sidebar-section { margin-bottom: 18px; }
    .sidebar-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #555; margin-bottom: 6px; }
    .contact-line { font-size: 11px; color: #555; }
    .contact-line span { display: block; }

    .tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag { background: #e3f2fd; color: #0d47a1; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 500; }
    .tag--cert { background: #fff3e0; color: #ef6c00; }
    .list { list-style: none; font-size: 11px; color: #444; }
    .list li { margin-bottom: 2px; }

    .main { padding-left: 6px; }
    .main-section { margin-bottom: 20px; }
    .main-section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0077b5;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 4px;
    }
    .main-content { font-size: 11.5px; line-height: 1.7; }
    .exp-entry { margin-bottom: 12px; }
    .exp-entry--spaced { margin-top: 16px; }
    .exp-dates { font-size: 10.5px; font-style: italic; color: #666; margin-bottom: 2px; }
    .exp-title-company { font-size: 12.5px; margin-bottom: 2px; }
    .exp-role { font-weight: 700; color: #000; }
    .exp-company { font-weight: 600; color: #444; }
    .exp-location { font-size: 11px; color: #666; margin-bottom: 4px; }
    .exp-description { margin-top: 4px; }
    .exp-description ul { padding-left: 18px; margin: 0; }
    .exp-description li { margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="cv-grid">
    <aside class="sidebar">
      ${photo ? `<img src="${photo}" alt="Profile Photo" style="${photoStyle}">` : ''}
      <div class="sidebar-header">
        <div class="sidebar-name">${userProfile?.name || 'Ihr Name'}</div>
        <div class="sidebar-title-main">${userProfile?.title || ''}</div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-title">${sidebar.contact}</div>
        <div class="contact-line">
          ${userProfile?.email ? `<span>📧 ${userProfile.email}</span>` : ''}
          ${userProfile?.phone ? `<span>📱 ${userProfile.phone}</span>` : ''}
          ${userProfile?.location ? `<span>📍 ${userProfile.location}</span>` : ''}
        </div>
      </div>
      ${langsHTML}
      ${skillsHTML}
      ${certsHTML}
    </aside>
    <main class="main">
      ${mainSectionsHtml}
    </main>
  </div>
</body>
</html>`;
  }

  // =========================================================
  // LAYOUT 2: CLASSIC / SINGLE COLUMN
  // =========================================================
  const skills = userProfile?.skills || [];
  const certifications = userProfile?.licenses || [];
  const getVal = (x: any) => typeof x === 'string' ? x : (x.name || x.title || JSON.stringify(x));

  const skillsHTML = Array.isArray(skills) && skills.length
    ? `<div class="section"><div class="section-title">${l.skills}</div><div class="skills-list">${skills.map(s => `<span class="skill-tag">${getVal(s)}</span>`).join('')}</div></div>`
    : '';

  const certsHTML = Array.isArray(certifications) && certifications.length
    ? `<div class="section"><div class="section-title">${l.certifications}</div><div class="skills-list">${certifications.map(c => `<span class="skill-tag" style="background: #fff3e0; color: #ef6c00;">${getVal(c)}</span>`).join('')}</div></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <title>CV - ${userProfile?.name || 'Applicant'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 850px; margin: 0 auto; padding: 30px 40px; background: #fff; }
    .header { margin-bottom: 25px; padding-bottom: 20px; border-bottom: 3px solid #0077b5; }
    .name { font-size: 28px; font-weight: 700; color: #0077b5; }
    .contact { font-size: 13px; color: #666; margin-top: 8px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: 700; color: #0077b5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #e0e0e0; }
    .content { font-size: 14px; line-height: 1.7; }
    .skills-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .skill-tag { background: #e3f2fd; color: #0077b5; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; }
    
    .exp-entry { margin-bottom: 15px; }
    .exp-dates { float: right; color: #666; font-size: 13px; }
    .exp-role { font-weight: 700; font-size: 15px; }
    .exp-company { font-weight: 600; color: #444; }
    .exp-location { font-size: 13px; color: #666; display: inline-block; margin-left: 10px; }
    .exp-description { margin-top: 5px; }
    .exp-description ul { margin-left: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${userProfile?.name || 'Your Name'}</div>
    <div class="contact">
      ${userProfile?.email ? `📧 ${userProfile.email}` : ''} 
      ${userProfile?.phone ? `| 📱 ${userProfile.phone}` : ''} 
      ${userProfile?.location ? `| 📍 ${userProfile.location}` : ''}
    </div>
  </div>
  
  ${summaryText ? `
  <div class="section">
    <div class="section-title">${l.summary}</div>
    <div class="content">${formatContent(summaryText)}</div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">${l.experience}</div>
    <div class="content">
      ${renderExperiences()}
    </div>
  </div>

  <div class="section">
    <div class="section-title">${l.education}</div>
    <div class="content">
      ${renderEducations()}
    </div>
  </div>
  
  ${skillsHTML}
  ${certsHTML}
</body>
</html>`;
}
