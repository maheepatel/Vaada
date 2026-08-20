/**
 * Loads .env.local for scripts run outside Next.js.
 *
 * `npm run db:seed` is documented as the way to load the founding register,
 * and it did not work: tsx runs the script in a bare Node process, Next.js is
 * never involved, and nothing populates process.env from .env.local. The
 * script then exited saying the variables were unset while they sat in the
 * file two directories up.
 *
 * Deliberately not a dependency. This is thirty lines against a package, and a
 * seeding script that pulls in dotenv to read six lines of text is a package
 * this project does not need.
 *
 * Values already present in the real environment win, so CI and a shell export
 * still override the file.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadEnv(file = '.env.local'): void {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;

  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // Strip one layer of matching quotes, which people add out of habit.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
