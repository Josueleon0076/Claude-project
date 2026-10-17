// Copia las lecciones y el banco de entrevistas desde la versión CLI,
// para que ambas apps compartan exactamente el mismo contenido.
// Uso: npm run sync-content
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, '..', 'englishboost-cli', 'englishboost', 'data');
const target = join(root, 'src', 'data');

rmSync(join(target, 'lessons'), { recursive: true, force: true });
mkdirSync(join(target, 'lessons'), { recursive: true });
const lessonFiles = readdirSync(join(source, 'lessons')).filter((f) => f.endsWith('.json')).sort();
for (const file of lessonFiles) {
  cpSync(join(source, 'lessons', file), join(target, 'lessons', file));
}
cpSync(join(source, 'interview.json'), join(target, 'interview.json'));
console.log(`Copiados ${lessonFiles.length} archivos de lecciones + interview.json`);
console.log('Recuerda actualizar src/content.js si agregaste archivos nuevos:', lessonFiles.join(', '));
