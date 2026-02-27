# Deployment Guide

This document explains the full CI/CD setup for the Skillpal / ListingHub
application (Node.js/Express backend + Next.js 15 frontend) deployed to a
DigitalOcean Droplet at **143.244.185.51**.

---

## Architecture Overview

```
Push to main
     │
     ▼
GitHub Actions
  ├─ Job 1: build-frontend  (runs on GitHub runner – 7 GB RAM)
  │    └─ npm ci + next build → uploads .next artifact
  │
  └─ Job 2: deploy  (runs after build-frontend succeeds)
       ├─ Downloads .next artifact
       ├─ SCP: copies .next to /var/www/skillpal/frontend/.next
       └─ SSH:
            ├─ git pull origin main
            ├─ backend: npm ci + prisma generate + tsc
            ├─ frontend: npm ci --omit=dev  (build already done above)
            └─ pm2 restart skillpal-backend + skillpal-frontend
```

---

## GitHub Secrets Required

Go to your repository on GitHub:
**Settings → Secrets and variables → Actions → New repository secret**

| Secret name                  | Value                                                      |
|------------------------------|------------------------------------------------------------|
| `HOST`                       | `143.244.185.51`                                           |
| `USERNAME`                   | `root`                                                     |
| `PORT`                       | `22`                                                       |
| `KEY`                        | Full content of the **private** SSH key (see below)        |
| `PASSPHRASE`                 | Passphrase for the SSH key, or leave blank if none         |
| `GITHUB_PAT`                 | GitHub Personal Access Token with `repo` scope             |
| `NEXT_PUBLIC_API_URL`        | e.g. `https://api.yourdomain.com`                          |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Your Google OAuth client ID                              |

---

## Step-by-Step: Add the SSH Private Key Secret

### On Windows (your machine)

1. Open **PowerShell** (or Git Bash) and run:

   ```powershell
   Get-Content "C:\Users\Nitin\Desktop\skillpal_ssh_key" | Set-Clipboard
   ```

   This copies the entire private key to your clipboard.

2. Go to GitHub → your repo → **Settings → Secrets and variables → Actions**.

3. Click **New repository secret**.

4. Name: `KEY`

5. Value: paste from clipboard (Ctrl+V).

   The value should look like:
   ```
   -----BEGIN OPENSSH PRIVATE KEY-----
   b3BlbnNzaC1rZXktdjEAAAAA...
   -----END OPENSSH PRIVATE KEY-----
   ```
   Make sure the entire key including the `-----BEGIN` and `-----END` lines
   is included, with no trailing spaces.

6. Click **Add secret**.

> **Security note:** Never commit the private key file to git.
> Never share it in Slack, email, or any other channel.

---

## Step-by-Step: Create a GitHub Personal Access Token (PAT)

The PAT is needed because the repo is **private**. The SSH action on the
server uses the PAT to authenticate `git pull`.

1. Go to **GitHub → Settings (your account, not the repo) →
   Developer settings → Personal access tokens → Tokens (classic)**.

2. Click **Generate new token (classic)**.

3. Note / name: `skillpal-deploy`

4. Expiration: set a reasonable expiry (e.g. 1 year) and calendar a reminder
   to rotate it before it expires.

5. Scopes: tick **repo** (full control of private repositories).

6. Click **Generate token** and immediately copy the token value.

7. Add it as a GitHub secret named `GITHUB_PAT` (see table above).

---

## Step-by-Step: Add All Secrets to GitHub

1. Navigate to: `https://github.com/designdigistratics-dotcom/listing-hub/settings/secrets/actions`

2. For each row in the table at the top of this file, click
   **New repository secret**, fill in the name and value, and save.

3. Verify the secrets list shows all 8 secrets before triggering a deploy.

---

## How the Server-Side Deploy Script Works

`deploy/deploy.sh` is a standalone script you can run manually on the server
when you need to re-deploy without going through GitHub Actions (e.g. after
an emergency hotfix applied directly on the server).

```bash
# On the server, as root:
source /etc/skillpal/secrets    # loads GITHUB_PAT into the environment (optional)
bash /var/www/skillpal/deploy/deploy.sh
```

Logs are appended to `/var/log/skillpal-deploy.log`.

---

## PM2 Process Names

The workflow targets these exact PM2 process names (defined in
`backend/ecosystem.config.js`):

| PM2 name            | Directory                        | Port |
|---------------------|----------------------------------|------|
| `skillpal-backend`  | `/var/www/skillpal/backend`      | 5000 |
| `skillpal-frontend` | `/var/www/skillpal/frontend`     | 3000 |

---

## Verifying a Deployment

### 1. Watch the GitHub Actions run

- Go to the **Actions** tab of the repo.
- Click the most recent **"Deploy to Production"** workflow run.
- Expand each step to see its output.
- Both jobs must show a green checkmark.

### 2. Check PM2 on the server

```bash
ssh root@143.244.185.51
pm2 list
pm2 logs skillpal-backend --lines 50
pm2 logs skillpal-frontend --lines 50
```

### 3. Hit the health endpoints

```bash
# Backend health check
curl -s https://api.yourdomain.com/health

# Frontend (should return the HTML of the home page)
curl -sI https://yourdomain.com
```

### 4. Check the deployment log

```bash
tail -f /var/log/skillpal-deploy.log
```

---

## Troubleshooting

| Symptom                                        | Likely cause & fix                                                     |
|------------------------------------------------|------------------------------------------------------------------------|
| "Permission denied (publickey)"                | Wrong SSH key in `KEY` secret. Re-paste the entire private key.        |
| "Host key verification failed"                 | First connection; run `ssh-keyscan 143.244.185.51` and add the result to the workflow's `known_hosts` (handled automatically by appleboy/ssh-action). |
| `npm ci` fails with peer-dep errors            | Lock file out of sync. Run `npm install` locally, commit `package-lock.json`, and push. |
| `next build` fails with "out of memory"        | Build runs on GitHub runner (7 GB) – should not happen. If it does, add `NODE_OPTIONS=--max-old-space-size=4096` to the build step env. |
| PM2 process not found                          | PM2 name mismatch. Run `pm2 list` on the server and update `ecosystem.config.js` if the names differ. |
| Frontend shows stale content after deploy      | The `.next` artifact upload (SCP step) failed. Check the "Upload .next build to server" step in the Actions log. |
| `prisma generate` fails                        | Prisma CLI not in `node_modules`. Ensure `prisma` is in `devDependencies` in `backend/package.json` (it is). |

---

## Secret Rotation Checklist

When rotating credentials (recommended every 90 days or when a team member
leaves):

- [ ] Generate a new SSH key pair, add the public key to the server's
      `~/.ssh/authorized_keys`, update `KEY` (and `PASSPHRASE`) in GitHub
      Secrets, then remove the old public key from the server.
- [ ] Generate a new GitHub PAT, update `GITHUB_PAT` in GitHub Secrets,
      then revoke the old PAT.
- [ ] Update `NEXT_PUBLIC_*` secrets if API URLs or OAuth credentials change.
