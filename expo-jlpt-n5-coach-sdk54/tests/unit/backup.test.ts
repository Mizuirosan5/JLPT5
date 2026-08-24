import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarizeLocalBackup, validateLocalBackup } from '../../services/localBackupFormat';

describe('format de sauvegarde locale', () => {
  it('accepte une sauvegarde V8 valide et conserve Unicode', () => {
    const backup = validateLocalBackup({
      format: 'coach-japonais-n5-local-backup',
      version: 1,
      databaseName: 'jlpt_n5_mobile_v8.db',
      schemaVersion: 8,
      exportedAt: '2026-08-24T00:00:00.000Z',
      tables: { app_writing_journal_entry: [{ id: '1', content: '今日は日本語を勉強します。' }] },
    });
    assert.equal(backup.tables.app_writing_journal_entry[0].content, '今日は日本語を勉強します。');
    assert.equal(summarizeLocalBackup(backup).totalRows, 1);
  });

  it('refuse les formats inconnus, futurs et corrompus', () => {
    assert.throws(() => validateLocalBackup(null), /objet JSON attendu/);
    assert.throws(() => validateLocalBackup({ format: 'autre' }), /format non reconnu/);
    assert.throws(() => validateLocalBackup({
      format: 'coach-japonais-n5-local-backup', version: 1, schemaVersion: 9,
      exportedAt: '2026-08-24T00:00:00.000Z', tables: {},
    }), /trop recente/);
  });
});
