
// If line 23 Bal is 2.
// generateCVHTML { -> 1.
// try { -> 2. catch } -> 1.
// So line 23 should be 1.
// But it says 2.
// This means try/catch didn't close properly?

// Lines 15-22:
//   try {
//      const jsonClean = content.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
//      if (jsonClean.startsWith('{')) {
//        rewritten = JSON.parse(jsonClean);
//      }
//   } catch (e) {
//      console.error('Failed to parse CV JSON content:', e);
//   }

// Let's count explicitly.
// 15: try { -> +1
// 17: if ... { -> +1
// 19: } -> -1
// 20: } catch (e) { -> -1 + 1 (net 0 change relative to start of catch, but } closes try)
// 22: } -> -1

// Net change 15-22 should be 0.
// Let's run a script just on lines 15-22.

path = '/app/new_generate_cv_v3.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

balance = 0
for i, line in enumerate(lines):
    if i < 14 or i > 23: continue
    
    for char in line:
        if char == '{': balance += 1
        elif char == '}': balance -= 1
    
    print(f"Line {i+1}: {line.strip()} Bal: {balance}")
