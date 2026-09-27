import { lstat } from 'fs/promises'
import path from 'path'

/**
 * pnpm records every package in `index.db` or, until it is checkpointed, its
 * write-ahead log. Returns undefined if the store has no index.
 */
export async function fingerprintStore(storePath: string): Promise<string | undefined> {
  const [index, wal] = await Promise.all(
    ['index.db', 'index.db-wal'].map(name => lstat(path.join(storePath, name)).catch(() => undefined)),
  )
  if (!index) return undefined
  return [index, wal].map(stats => stats ? `${stats.size}:${stats.mtimeMs}` : 'none').join(' ')
}
