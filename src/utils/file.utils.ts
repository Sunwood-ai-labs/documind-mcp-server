import * as fs from 'fs';
import * as path from 'path';

export async function findReadmeFiles(dir: string): Promise<string[]> {
  const readmeFiles: string[] = [];
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // node_modules と .git ディレクトリはスキップ
      if (file !== 'node_modules' && file !== '.git') {
        readmeFiles.push(...await findReadmeFiles(fullPath));
      }
    } else if (file.toLowerCase() === 'readme.md' || file.toLowerCase() === 'readme.ja.md') {
      readmeFiles.push(fullPath);
    }
  }
  
  return readmeFiles;
}