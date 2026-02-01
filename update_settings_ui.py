
import os

path = '/app/src/components/SettingsPanel.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert the LanguageInput component definition at the top (after imports)
# Assuming imports end around line 7.
# We will insert it before `function SettingsPanel`

snippet_path = '/app/src/components/SettingsPanel.tsx_snippet'
with open(snippet_path, 'r', encoding='utf-8') as f:
    snippet = f.read()

# Extract just the component function from snippet (ignore imports)
start_marker = "// --- Language Input Component (Inline) ---"
snippet_content = snippet[snippet.find(start_marker):]
# Remove the last line comment if present
if "// ... rest" in snippet_content:
    snippet_content = snippet_content.split("// ... rest")[0]

# Insert component
settings_panel_start = content.find("function SettingsPanel")
if settings_panel_start == -1:
    print("Could not find SettingsPanel function")
    exit(1)

new_content = content[:settings_panel_start] + snippet_content + "\n" + content[settings_panel_start:]

# 2. Replace the Languages textarea with the new component
# Look for: <textarea style={{...inputStyle, height: '80px'}} value={profile.languages}
# Replace with: <LanguageInput value={profile.languages} onChange={val => setProfile({...profile, languages: val})} />

textarea_marker = "value={profile.languages} onChange={e => setProfile({...profile, languages: e.target.value})}"
start_textarea = new_content.rfind("<textarea", 0, new_content.find(textarea_marker))
end_textarea = new_content.find("/>", new_content.find(textarea_marker)) + 2

if start_textarea == -1 or end_textarea == -1:
    print("Could not find Languages textarea")
    exit(1)

# Replacement
replacement = "<LanguageInput value={profile.languages} onChange={(val: string) => setProfile({...profile, languages: val})} />"

final_content = new_content[:start_textarea] + replacement + new_content[end_textarea:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("SettingsPanel updated successfully")
