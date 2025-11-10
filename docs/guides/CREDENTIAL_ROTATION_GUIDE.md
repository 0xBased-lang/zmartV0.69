# Credential Rotation Guide

**Date:** November 8, 2025
**Priority:** 🔴 CRITICAL - Complete immediately if any credentials were exposed

## Overview

This guide documents how to rotate all credentials for the ZMART platform after a potential exposure.

## Credentials to Rotate

### 1. Supabase (Database)
**Dashboard:** https://app.supabase.com/project/YOUR_PROJECT/settings/api

**Steps:**
1. Log into Supabase dashboard
2. Navigate to Settings → API
3. Regenerate both keys:
   - Anon (public) key - Used by frontend
   - Service Role key - Used by backend (KEEP SECRET!)
4. Update in all environments:
   - Local: backend/.env
   - Production: Environment variables
   - CI/CD: GitHub Actions secrets

### 2. Helius (Solana RPC & Webhooks)
**Dashboard:** https://dashboard.helius.dev/

**Steps:**
1. Log into Helius dashboard
2. Navigate to your project
3. Regenerate API key
4. Create new webhook secret
5. Update webhook URL if compromised
6. Update in all services that use Helius

### 3. Pinata (IPFS)
**Dashboard:** https://app.pinata.cloud/

**Steps:**
1. Log into Pinata
2. Navigate to API Keys
3. Delete compromised keys
4. Generate new API key pair
5. Generate new JWT
6. Update IPFS service configuration

### 4. Redis
**For local:** Change password in redis.conf
**For cloud:** Use provider's dashboard

**Steps:**
1. Update Redis password
2. Restart Redis service
3. Update connection strings in:
   - Vote Aggregator service
   - Any other services using Redis

### 5. Solana Keypairs
**CRITICAL:** If keypairs were exposed, funds may be at risk!

**Steps:**
1. Generate new keypair:
   ```bash
   solana-keygen new --outfile ~/.config/solana/new-authority.json
   ```
2. Fund new keypair:
   ```bash
   solana airdrop 2 <NEW_PUBLIC_KEY> --url devnet
   ```
3. Update program authority (if needed):
   ```bash
   solana program set-upgrade-authority <PROGRAM_ID> <NEW_AUTHORITY> \
     --upgrade-authority <OLD_AUTHORITY> --url devnet
   ```
4. Update backend configuration
5. IMPORTANT: Move any remaining funds from old keypair

### 6. JWT Secrets
**Generate new secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update in all services that use JWT authentication.

## Verification Checklist

After rotation, verify:

- [ ] Backend services can connect to Supabase
- [ ] Helius webhooks are being received
- [ ] IPFS uploads work with new Pinata credentials
- [ ] Redis connection successful
- [ ] Solana transactions work with new keypair
- [ ] No services are using old credentials
- [ ] All environment variables updated
- [ ] CI/CD pipelines still work
- [ ] Production deployments updated

## Security Recommendations

1. **Use a Secrets Manager**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Or Doppler, 1Password for Teams

2. **Enable 2FA** on all service accounts:
   - GitHub
   - Supabase
   - Helius
   - Pinata
   - Cloud providers

3. **Set up monitoring**:
   - GitGuardian for secret scanning
   - GitHub secret scanning
   - Regular security audits

4. **Access Control**:
   - Principle of least privilege
   - Separate dev/staging/production credentials
   - Regular access reviews

5. **Rotation Schedule**:
   - Every 90 days for production
   - After any team member leaves
   - Immediately if exposure suspected

## Emergency Contacts

- Supabase Support: support@supabase.com
- Helius Support: Through dashboard
- Pinata Support: support@pinata.cloud
- Team Security Lead: [YOUR_CONTACT]

## Incident Response

If credentials are exposed:

1. **Immediate Actions** (within 1 hour):
   - Rotate affected credentials
   - Check for unauthorized access
   - Notify team lead

2. **Investigation** (within 24 hours):
   - Review access logs
   - Identify exposure timeline
   - Document incident

3. **Remediation** (within 48 hours):
   - Complete all rotations
   - Update all systems
   - Implement prevention measures

4. **Post-Incident** (within 1 week):
   - Conduct retrospective
   - Update security procedures
   - Share learnings with team

## Prevention Measures

1. Never commit .env files
2. Use .env.example templates
3. Enable pre-commit hooks
4. Regular security training
5. Automated secret scanning
6. Proper .gitignore configuration

---

**Last Updated:** November 8, 2025
**Next Review:** February 8, 2026