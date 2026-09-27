import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, test } from 'node:test'
import { fingerprintStore } from './index.ts'

const root = mkdtempSync(path.join(os.tmpdir(), 'setup-store-fingerprint-'))
after(() => rmSync(root, { recursive: true, force: true }))

let stores = 0
function createStore() {
  const store = path.join(root, `store-${stores++}`)
  mkdirSync(path.join(store, 'files'), { recursive: true })
  writeFileSync(path.join(store, 'index.db'), 'rows')
  return store
}

function touch(file) {
  const later = new Date(Date.now() + 60_000)
  utimesSync(file, later, later)
}

test('files outside the index do not change the fingerprint', async () => {
  const store = createStore()
  const before = await fingerprintStore(store)
  writeFileSync(path.join(store, 'files', 'abc'), 'content')
  assert.equal(await fingerprintStore(store), before)
})

for (const [label, change] of [
  ['a written index', store => touch(path.join(store, 'index.db'))],
  ['a new write-ahead log', store => writeFileSync(path.join(store, 'index.db-wal'), 'rows')],
]) {
  test(`${label} changes the fingerprint`, async () => {
    const store = createStore()
    const before = await fingerprintStore(store)
    change(store)
    assert.notEqual(await fingerprintStore(store), before)
  })
}

test('a store without an index has no fingerprint', async () => {
  const store = createStore()
  rmSync(path.join(store, 'index.db'))
  assert.equal(await fingerprintStore(store), undefined)
})
