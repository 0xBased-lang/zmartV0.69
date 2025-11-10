#!/bin/bash
# ZMART V0.69 - Backup Script
# Usage: ./scripts/backup.sh

set -e  # Exit on error

echo "======================================"
echo "ZMART V0.69 - Backup System"
echo "======================================"
echo ""

# Configuration
VPS_HOST="kek"
VPS_PATH="/var/www/zmart/backend"
BACKUP_DIR="/Users/seman/Desktop/zmartV0.69/backups"
DATE=$(date +'%Y%m%d-%H%M%S')
SUPABASE_PROJECT_ID="tkkqqxepelibqjjhxxct"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"
echo -e "${YELLOW}Backup destination: $BACKUP_DIR/$DATE${NC}"
echo ""

total_size=0
backup_count=0

# ===================================
# BACKUP VPS CODE
# ===================================
echo -e "${BLUE}[1/4] Backing up VPS code...${NC}"

echo "Creating tarball of backend code..."
ssh $VPS_HOST "cd /var/www/zmart && tar -czf /tmp/zmart-backend-$DATE.tar.gz backend --exclude='node_modules' --exclude='dist' --exclude='logs/*.log'"

echo "Downloading backup..."
scp $VPS_HOST:/tmp/zmart-backend-$DATE.tar.gz "$BACKUP_DIR/$DATE/"

echo "Cleaning up remote temp file..."
ssh $VPS_HOST "rm /tmp/zmart-backend-$DATE.tar.gz"

vps_size=$(du -h "$BACKUP_DIR/$DATE/zmart-backend-$DATE.tar.gz" | awk '{print $1}')
echo -e "${GREEN}✅ VPS code backed up ($vps_size)${NC}"
((backup_count++))
echo ""

# ===================================
# BACKUP LOCAL CODE
# ===================================
echo -e "${BLUE}[2/4] Backing up local repository...${NC}"

cd /Users/seman/Desktop/zmartV0.69
git bundle create "$BACKUP_DIR/$DATE/zmart-git-$DATE.bundle" --all

git_size=$(du -h "$BACKUP_DIR/$DATE/zmart-git-$DATE.bundle" | awk '{print $1}')
echo -e "${GREEN}✅ Local repository backed up ($git_size)${NC}"
((backup_count++))
echo ""

# ===================================
# BACKUP ENVIRONMENT FILES
# ===================================
echo -e "${BLUE}[3/4] Backing up environment files...${NC}"

# Create encrypted backup of .env files
tar -czf "$BACKUP_DIR/$DATE/env-files-$DATE.tar.gz" \
  backend/.env \
  frontend/.env.local \
  .env.test 2>/dev/null || echo "  Some .env files not found (OK if not all exist)"

# Encrypt backup (requires password)
echo "Encrypting .env backup (enter password when prompted)..."
openssl enc -aes-256-cbc -salt \
  -in "$BACKUP_DIR/$DATE/env-files-$DATE.tar.gz" \
  -out "$BACKUP_DIR/$DATE/env-files-$DATE.tar.gz.enc" \
  -k "$(read -sp 'Encryption password: ' pwd && echo $pwd)"

echo ""
rm "$BACKUP_DIR/$DATE/env-files-$DATE.tar.gz"  # Remove unencrypted version

env_size=$(du -h "$BACKUP_DIR/$DATE/env-files-$DATE.tar.gz.enc" | awk '{print $1}')
echo -e "${GREEN}✅ Environment files backed up (encrypted, $env_size)${NC}"
echo -e "${YELLOW}⚠️  Save encryption password securely!${NC}"
((backup_count++))
echo ""

# ===================================
# BACKUP SUPABASE DATABASE
# ===================================
echo -e "${BLUE}[4/4] Backing up Supabase database...${NC}"

if command -v supabase &> /dev/null; then
  echo "Dumping database schema and data..."
  supabase db dump --project-id $SUPABASE_PROJECT_ID > "$BACKUP_DIR/$DATE/supabase-dump-$DATE.sql" 2>/dev/null || \
    echo "  ⚠️  Supabase CLI not authenticated or project not linked"

  if [[ -f "$BACKUP_DIR/$DATE/supabase-dump-$DATE.sql" ]]; then
    db_size=$(du -h "$BACKUP_DIR/$DATE/supabase-dump-$DATE.sql" | awk '{print $1}')
    echo -e "${GREEN}✅ Database backed up ($db_size)${NC}"
    ((backup_count++))
  else
    echo -e "${YELLOW}⚠️  Database backup skipped (not authenticated)${NC}"
    echo "    Run: supabase login"
  fi
else
  echo -e "${YELLOW}⚠️  Supabase CLI not installed${NC}"
  echo "    Install: brew install supabase/tap/supabase"
fi

echo ""

# ===================================
# BACKUP SUMMARY
# ===================================
total_size=$(du -sh "$BACKUP_DIR/$DATE" | awk '{print $1}')

echo "======================================"
echo -e "${GREEN}✅ Backup Complete!${NC}"
echo "======================================"
echo ""
echo "Location: $BACKUP_DIR/$DATE"
echo "Components backed up: $backup_count"
echo "Total size: $total_size"
echo ""
echo "Files:"
ls -lh "$BACKUP_DIR/$DATE" | tail -n +2 | awk '{print "  " $9 " (" $5 ")"}'
echo ""

# ===================================
# CLEANUP OLD BACKUPS
# ===================================
echo -e "${YELLOW}Checking for old backups...${NC}"

# Keep last 7 daily backups
old_backups=$(find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +7 | wc -l)

if [[ $old_backups -gt 0 ]]; then
  echo "Found $old_backups backups older than 7 days"
  read -p "Delete old backups? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
    echo -e "${GREEN}✅ Old backups deleted${NC}"
  else
    echo "Old backups kept"
  fi
fi

echo ""
echo "======================================"
echo "RESTORE INSTRUCTIONS"
echo "======================================"
echo ""
echo "To restore VPS code:"
echo "  scp $BACKUP_DIR/$DATE/zmart-backend-$DATE.tar.gz $VPS_HOST:/tmp/"
echo "  ssh $VPS_HOST 'cd /var/www/zmart && tar -xzf /tmp/zmart-backend-$DATE.tar.gz'"
echo ""
echo "To restore local repository:"
echo "  git clone $BACKUP_DIR/$DATE/zmart-git-$DATE.bundle zmart-restored"
echo ""
echo "To restore .env files (requires password):"
echo "  openssl enc -aes-256-cbc -d -in $BACKUP_DIR/$DATE/env-files-$DATE.tar.gz.enc -out env-files.tar.gz"
echo "  tar -xzf env-files.tar.gz"
echo ""
echo "To restore database:"
echo "  psql \$DATABASE_URL < $BACKUP_DIR/$DATE/supabase-dump-$DATE.sql"
echo ""
