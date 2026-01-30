
import { readdirSync } from 'fs';
import { join } from 'path';

function findFiles(dir: string, pattern: RegExp): string[] {
  let results: string[] = [];
  try {
    const list = readdirSync(dir);
    list.forEach(file => {
      const filePath = join(dir, file);
      const stat = require('fs').statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findFiles(filePath, pattern));
      } else {
        if (pattern.test(file)) {
          results.push(filePath);
        }
      }
    });
  } catch (e) {
    // ignore
  }
  return results;
}

const files = findFiles('/app/src', /types\.ts$|model\.ts$|interface\.ts$/);
console.log(files.join('\n'));
