# Restore from backup

Backups live at `/var/backups/mongodb/topgoldpicks-YYYYMMDDTHHMMSSZ.gz` on the production droplet.

## List available backups

```bash
ls -lah /var/backups/mongodb/
```

## Restore to a fresh database

```bash
# Pick the archive you want
ARCHIVE=/var/backups/mongodb/topgoldpicks-20260524T020000Z.gz

# Restore to a different db first (safe), then swap
mongorestore \
  --host 127.0.0.1 --port 27017 \
  --gzip --archive="$ARCHIVE" \
  --nsFrom='topgoldpicks.*' --nsTo='topgoldpicks_restored.*'

# Verify
mongosh topgoldpicks_restored --eval 'db.picks.countDocuments({})'

# Atomically swap
mongosh admin --eval '
  db.adminCommand({renameCollection: "topgoldpicks.picks", to: "topgoldpicks_old.picks"});
  db.adminCommand({renameCollection: "topgoldpicks_restored.picks", to: "topgoldpicks.picks"});
'
```

## Overwrite live database (destructive)

```bash
ARCHIVE=/var/backups/mongodb/topgoldpicks-20260524T020000Z.gz

systemctl stop topgoldpicks.service        # avoid mid-restore writes
mongorestore --host 127.0.0.1 --gzip --archive="$ARCHIVE" --drop
systemctl start topgoldpicks.service
```

The `--drop` flag drops collections before restoring. Without it, `mongorestore` skips existing documents.

## Off-host snapshot (DigitalOcean)

Cron-based local backups protect against logical errors (`db.dropDatabase()`, bad migration), but not against droplet loss. For off-host:

1. **DO snapshots** — `doctl compute droplet-action snapshot <id>` (or via dashboard). Costs ~20% of droplet pricing per snapshot/month.
2. **DO Spaces** — install `s3cmd`/`awscli`, configure with Spaces keys, push `/var/backups/mongodb/*.gz` on each backup. ~$5/mo for 250 GB.

Recommended: weekly DO snapshot + daily local backups for the first few months. Add Spaces upload once user data is in the picture.
