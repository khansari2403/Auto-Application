import sys

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Add AI error check and more logging
old_call = "let rawContent = await callAI(thinker, thinkerPrompt);"
new_call = """let rawContent = await callAI(thinker, thinkerPrompt);
        
        if (!rawContent || rawContent.startsWith('Error:')) {
          throw new Error(rawContent || 'AI returned empty content');
        }"""
content = content.replace(old_call, new_call)

# 2. Ensure job.id is handled as string for matching in UPDATE
content = content.replace("id: job.id,", "id: String(job.id),")

# 3. Add logging to saveDocumentFile
old_save_func = "fs.writeFileSync(filePath, content, 'utf-8');"
new_save_func = """console.log(`Saving document to: ${filePath}`);
  fs.writeFileSync(filePath, content, 'utf-8');"""
content = content.replace(old_save_func, new_save_func)

with open(file_path, 'w') as f:
    f.write(content)
