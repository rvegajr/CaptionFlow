import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Db } from './client.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export async function runMigrations(db: Db, opts?: { migrationsFolder?: string }): Promise<void> {
  const distFolder = join(process.cwd(), 'dist/server/db/migrations');
  const srcFolder = join(process.cwd(), 'src/server/db/migrations');
  const folder =
    opts?.migrationsFolder ?? (existsSync(distFolder) ? distFolder : srcFolder);
  await migrate(db, { migrationsFolder: folder });
}
