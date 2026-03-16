#!/bin/sh
# NexDMS — Backup diario de PostgreSQL a Backblaze B2
# Se ejecuta a las 2am vía cron en el contenedor de backup

DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_FILE="/tmp/nexdms_backup_${DATE}.sql.gz"

echo "[backup] Iniciando backup ${DATE}..."

# Generar dump comprimido
PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
  -h postgres \
  -U nexdms \
  -d nexdms \
  --no-owner \
  --no-privileges \
  | gzip > $BACKUP_FILE

if [ $? -ne 0 ]; then
  echo "[backup] ERROR: falló pg_dump"
  # Notificar por email a Nexus Q Tech
  curl -s -X POST "https://api.resend.com/emails" \
    -H "Authorization: Bearer $RESEND_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"from\":\"backup@nexdms.com\",\"to\":\"$OPS_EMAIL\",\"subject\":\"[NexDMS] FALLO de backup ${DATE}\",\"html\":\"<p>El backup diario falló. Revisar el contenedor nexDMS_backup.</p>\"}"
  exit 1
fi

echo "[backup] Dump generado: $(du -sh $BACKUP_FILE | cut -f1)"

# Subir a Backblaze B2
# Usar API de B2 nativa (sin AWS CLI)
UPLOAD_URL=$(curl -s -u "$B2_KEY_ID:$B2_APP_KEY" \
  "https://api.backblazeb2.com/b2api/v2/b2_authorize_account" \
  | grep -o '"apiUrl":"[^"]*"' | cut -d'"' -f4)

echo "[backup] Subiendo a B2..."
curl -s \
  -H "Authorization: $(curl -s -u "$B2_KEY_ID:$B2_APP_KEY" \
    "https://api.backblazeb2.com/b2api/v2/b2_authorize_account" \
    | grep -o '"authorizationToken":"[^"]*"' | cut -d'"' -f4)" \
  -T "$BACKUP_FILE" \
  "${UPLOAD_URL}/b2api/v2/b2_upload_file?bucketId=${B2_BUCKET_BACKUP}&fileName=backups/postgres/${DATE}.sql.gz"

if [ $? -eq 0 ]; then
  echo "[backup] OK — backup subido exitosamente"
  rm -f $BACKUP_FILE
else
  echo "[backup] ERROR: falló la subida a B2"
  exit 1
fi

# Limpiar backups con más de 30 días (lo gestiona B2 lifecycle rules)
echo "[backup] Completado."
