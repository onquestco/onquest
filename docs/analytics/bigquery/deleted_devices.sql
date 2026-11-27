-- deleted_devices: the anon_ids (random device ids) seen with a deleted account's key. The erasure
-- job (AN-04) stores them on its first run, so the daily re-runs can still delete signed-out rows
-- from those devices that reach BigQuery late, after the rows linking them to the key are gone.
-- events_people_all anti-joins it with the shared-device guard: only signed-out rows or the
-- deleted person's own rows are hidden, never another person's signed-in rows.
CREATE TABLE IF NOT EXISTS `onquest_analytics.deleted_devices` (
  anon_id STRING NOT NULL OPTIONS (description = 'anon_<uuid> device id seen with the deleted key'),
  user_id STRING NOT NULL OPTIONS (description = 'User key of the deleted account'),
  deleted_at TIMESTAMP NOT NULL OPTIONS (description = 'When analytics erasure first stored this device')
)
OPTIONS (description = 'Device ids of deleted accounts (analytics-v2 spec 5.2). Random ids and keys only.');
