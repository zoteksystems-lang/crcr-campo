#!/bin/bash
# Baja todas las grabaciones de revisión a scratchpad/revision/ (uso: revisar_audios.sh [--borrar])
S=${REVISION_DIR:-$HOME/crcr-revision}
cd /d/ClaudeCode/CRC/CRCR_Campo_PWA
TOK=$(grep '^BLOB_READ_WRITE_TOKEN' .env.local | cut -d= -f2- | tr -d '"')
mkdir -p $S
for p in $(env -u VERCEL_OIDC_TOKEN vercel blob list --rw-token "$TOK" 2>&1 | grep -o 'revision/[^ ]*' | sort -u); do
  env -u VERCEL_OIDC_TOKEN vercel blob get "$p" --access private --rw-token "$TOK" -o "$S/$(basename $p)" >/dev/null 2>&1 && echo "bajado $p"
  [ "$1" = "--borrar" ] && env -u VERCEL_OIDC_TOKEN vercel blob del "$p" --rw-token "$TOK" >/dev/null 2>&1 && echo "borrado $p"
done
