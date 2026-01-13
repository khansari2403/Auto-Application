import sys

file_path = 'src/components/settings/AIModelsSection.tsx'
content = open(file_path).read()

# 1. Fix formData initialization
content = content.replace("coverLetterWordLimit: '280', cvPageLimit: '2', cvPageLimit: '2'", "coverLetterWordLimit: '280', cvPageLimit: '2'")

# 2. Add UI for cvPageLimit (making sure it's in the right place)
# I'll look for the Motivation Letter input and insert after it
if 'cvPageLimit' not in content or 'label style={{ display: \\'block\\', fontSize: \\'11px\\', fontWeight: \\'bold\\', marginBottom: \\'4px\\', color: \\'#1b5e20\\' }}>CV Page Limit</label>' not in content:
    ui_insertion = """                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#1b5e20' }}>CV Page Limit</label>
                          <input 
                            type='number' 
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #81c784', background: '#fff' }} 
                            value={formData.cvPageLimit} 
                            onChange={(e) => handleInputChange('cvPageLimit', e.target.value)} 
                            placeholder='1-2 pages'
                          />
                        </div>"""
    
    # Find the end of the Motivation Letter / Cover Letter grid
    content = content.replace("placeholder='250-300 words'\\n                          />\\n                        </div>", 
                             "placeholder='250-300 words'\\n                          />\\n                        </div>\\n" + ui_insertion)

# 3. Fix handleSave to include cvPageLimit
content = content.replace("motivationLetterWordLimit: '450', coverLetterWordLimit: '280', cvPageLimit: '2', cvPageLimit: '2'", 
                         "motivationLetterWordLimit: '450', coverLetterWordLimit: '280', cvPageLimit: '2'")

with open(file_path, 'w') as f:
    f.write(content)
