# OmniTutor AI - Backup, Snapshot & Disaster Recovery Guide

## 1. Overview
OmniTutor AI maintains two primary datastores and a file storage layer:
1. **MongoDB (Document Store):** Stores user accounts, sessions, course structures, metadata, conversation histories, study notes, quiz submissions, and topic mastery state.
2. **Qdrant (Vector Database):** Stores multimodal vector embeddings and payload metadata for curriculum retrieval (RAG).
3. **Storage Layer (Local / S3):** Stores raw uploaded files (PDF, DOCX, PPTX, TXT, MP3, MP4).

---

## 2. MongoDB Backup & Restoration

### 2.1 Full Logical Backup (`mongodump`)
To generate an archive of all databases with compression:
```bash
# Backup all collections with gzip compression
mongodump --uri="mongodb://localhost:27017/omnitutor" --archive=/backups/mongo/omnitutor_$(date +%Y%m%d_%H%M%S).archive.gz --gzip

# Docker Compose execution
docker exec omnitutor-mongodb mongodump --db=omnitutor --archive=/data/db/backup_omnitutor.gz --gzip
```

### 2.2 Logical Restoration (`mongorestore`)
To restore an archive:
```bash
# Drop existing collections and restore from gzip archive
mongorestore --uri="mongodb://localhost:27017/omnitutor" --drop --archive=/backups/mongo/omnitutor_YYYYMMDD_HHMMSS.archive.gz --gzip

# Docker Compose execution
docker exec omnitutor-mongodb mongorestore --db=omnitutor --drop --archive=/data/db/backup_omnitutor.gz --gzip
```

### 2.3 Point-in-Time Recovery (PITR) with Oplog
For replica set environments:
```bash
# Include the oplog during backup
mongodump --uri="mongodb://mongo1:27017,mongo2:27017/omnitutor?replicaSet=rs0" --oplog --archive=/backups/mongo/pitr_$(date +%s).gz --gzip

# Replay oplog up to a specific timestamp during restore
mongorestore --uri="mongodb://localhost:27017/omnitutor" --oplogReplay --oplogLimit="<timestamp>:1" --archive=/backups/mongo/pitr_timestamp.gz --gzip
```

---

## 3. Qdrant Vector Store Backup & Restoration

### 3.1 Snapshot Creation via HTTP API
Qdrant provides zero-downtime, point-in-time collection snapshots:
```bash
# Create a snapshot for the materials collection
curl -X POST "http://localhost:6333/collections/omnitutor_materials/snapshots"

# Response returns snapshot name:
# {
#   "result": {
#     "name": "omnitutor_materials-2026-10-13-14-30-00.snapshot",
#     "creation_time": "2026-10-13T14:30:00",
#     "size": 18452096
#   },
#   "status": "ok"
# }
```

### 3.2 Downloading & Archiving the Snapshot
```bash
# Download the generated snapshot to cold storage
SNAPSHOT_NAME="omnitutor_materials-2026-10-13-14-30-00.snapshot"
curl -o "/backups/qdrant/${SNAPSHOT_NAME}" \
  "http://localhost:6333/collections/omnitutor_materials/snapshots/${SNAPSHOT_NAME}"
```

### 3.3 Restoring a Qdrant Snapshot
To recover vector collections from a saved snapshot:
```bash
# Recover collection from uploaded snapshot
curl -X POST "http://localhost:6333/collections/omnitutor_materials/snapshots/recover" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "http://backup-server/snapshots/omnitutor_materials-2026-10-13-14-30-00.snapshot"
  }'

# Or upload local file directly:
curl -X POST "http://localhost:6333/collections/omnitutor_materials/snapshots/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "snapshot=@/backups/qdrant/${SNAPSHOT_NAME}"
```

---

## 4. Volume-Level Backup (Docker / Kubernetes)

### 4.1 Docker Volume Backup
When stopping containers for maintenance, persist disk volumes directly:
```bash
# Backup MongoDB persistent volume
docker run --rm -v mongo_data:/volume -v /backups/docker:/backup alpine \
  tar -czf /backup/mongo_data_$(date +%Y%m%d).tar.gz -C /volume .

# Backup Qdrant storage volume
docker run --rm -v qdrant_data:/volume -v /backups/docker:/backup alpine \
  tar -czf /backup/qdrant_data_$(date +%Y%m%d).tar.gz -C /volume .

# Backup Raw Uploaded Educational Files volume
docker run --rm -v omnitutor-ai_api_uploads:/volume -v /backups/docker:/backup alpine \
  tar -czf /backup/api_uploads_$(date +%Y%m%d).tar.gz -C /volume .
```

### 4.2 Docker Volume Restoration
```bash
# Restore MongoDB volume
docker run --rm -v mongo_data:/volume -v /backups/docker:/backup alpine \
  sh -c "rm -rf /volume/* && tar -xzf /backup/mongo_data_YYYYMMDD.tar.gz -C /volume"

# Restore Qdrant volume
docker run --rm -v qdrant_data:/volume -v /backups/docker:/backup alpine \
  sh -c "rm -rf /volume/* && tar -xzf /backup/qdrant_data_YYYYMMDD.tar.gz -C /volume"

# Restore Raw Uploaded Files volume
docker run --rm -v omnitutor-ai_api_uploads:/volume -v /backups/docker:/backup alpine \
  sh -c "rm -rf /volume/* && tar -xzf /backup/api_uploads_YYYYMMDD.tar.gz -C /volume"
```

---

## 5. Verification & Health Check Checklist
Following any restoration procedure:
1. Verify MongoDB connectivity: `npm run db:init` (ensures all 81 indexes sync properly).
2. Check vector collection health:
   ```bash
   curl "http://localhost:6333/collections/omnitutor_materials"
   ```
3. Probe API health endpoint:
   ```bash
   curl "http://localhost:4000/api/v1/health"
   curl "http://localhost:4000/api/v1/ready"
   ```
4. Verify RAG retrieval with test citation lookup (`/api/v1/rag/query`).
