# Operator Setup Guide

This guide covers the steps to deploy the docs-poc platform from a blank environment.

## 1. GitHub OAuth App (User Identity)

1. Go to GitHub Settings → Developer settings → OAuth Apps → **New OAuth App**
2. Fill in the form:
   - **Application name:** Docs Platform
   - **Homepage URL:** `https://docs.internal` (replace with your actual domain)
   - **Authorization callback URL:** `https://docs.internal/api/auth/callback` (must match your domain)
3. After creation, copy:
   - **Client ID** → `GITHUB_CLIENT_ID` env var
   - **Client Secret** (click "Generate" if needed) → `GITHUB_CLIENT_SECRET` env var

## 2. GitHub App (Bot Identity for Commits)

1. Go to GitHub Settings → Developer settings → GitHub Apps → **New GitHub App**
2. Fill in the form:
   - **GitHub App name:** `docs-bot` (or similar)
   - **Homepage URL:** `https://docs.internal`
   - **Webhook → Active:** Uncheck (we don't use webhooks)
   - **Permissions:**
     - Repository → Contents: **Read & write**
     - Repository → Discussions: **Read & write**
     - Repository → Metadata: **Read-only** (auto-selected)
3. Copy **App ID** → `GITHUB_APP_ID` env var
4. **Generate a private key:**
   - Scroll to "Private keys" → Click **Generate a private key**
   - Save the downloaded `.pem` file
   - Convert to single line (preserve newlines as `\n`):
     ```bash
     awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' your-private-key.pem
     ```
   - The output → `GITHUB_APP_PRIVATE_KEY` env var
5. **Install the app on your repo:**
   - Go to the GitHub App page → Click **Install App**
   - Select the organization and the docs repository
   - You'll be redirected to `https://github.com/settings/installations/{ID}`
   - Copy the installation ID from the URL → `GITHUB_APP_INSTALLATION_ID` env var

## 3. GitHub Discussions Categories

Discussions must have two categories for comments and suggestions.

1. Go to your repository → **Discussions** → **Edit categories**
2. Create two categories (if they don't already exist):
   - **Name:** `Comments` (format: Open-ended discussion)
   - **Name:** `Suggestions` (format: Open-ended discussion)
3. Get the node IDs via GraphQL:
   ```graphql
   query {
     repository(owner: "YOUR_ORG", name: "YOUR_REPO") {
       discussionCategories(first: 10) {
         nodes {
           id
           name
         }
       }
     }
   }
   ```
   Run this at [https://github.com/graphql](https://github.com/graphql) (GitHub's GraphQL explorer)
4. Copy the `id` values:
   - Comments category `id` → `DISCUSSIONS_COMMENTS_CATEGORY_ID`
   - Suggestions category `id` → `DISCUSSIONS_SUGGESTIONS_CATEGORY_ID`

## 4. Environment Variables

Create a `.env.local` file (or configure in your deployment) with these variables:

| Variable | Source | Example |
|---|---|---|
| `GITHUB_CLIENT_ID` | OAuth App → Client ID | `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | OAuth App → Client Secret | `abc123...` |
| `GITHUB_REPO_OWNER` | Your GitHub org or username | `myorg` |
| `GITHUB_REPO_NAME` | Repository name | `docs-poc` |
| `GITHUB_DOCS_ROOT` | Top-level docs folder | `doc` |
| `GITHUB_APP_ID` | GitHub App → App ID | `123456` |
| `GITHUB_APP_PRIVATE_KEY` | Private key content (newlines as `\n`) | `-----BEGIN RSA PRIVATE KEY-----\n...` |
| `GITHUB_APP_INSTALLATION_ID` | From installation URL | `12345678` |
| `DISCUSSIONS_COMMENTS_CATEGORY_ID` | From GraphQL query | `DIC_kwDOAbcd...` |
| `DISCUSSIONS_SUGGESTIONS_CATEGORY_ID` | From GraphQL query | `DIC_kwDOAbcd...` |
| `SESSION_SECRET` | Random 32+ character string | See below |
| `REGISTRY` | Container registry host (for Docker deploy) | `ghcr.io/myorg` |

### Generate SESSION_SECRET

```bash
openssl rand -hex 32
# Output: abc123def456abc123def456abc123de
```

Use that as your `SESSION_SECRET` value. Store it securely.

## 5. Docker Build & Push

If deploying to Kubernetes, build and push the image:

```bash
# Build (with build args and secrets)
docker build \
  --secret id=github_token,env=GITHUB_TOKEN \
  --build-arg GITHUB_REPO_OWNER=myorg \
  --build-arg GITHUB_REPO_NAME=docs-poc \
  --build-arg GITHUB_DOCS_ROOT=doc \
  -t ghcr.io/myorg/docs-poc:latest \
  ./web

# Push to registry
docker push ghcr.io/myorg/docs-poc:latest
```

**Note:** `GITHUB_TOKEN` must have `read:repo` and `gist` permissions to fetch docs content during the build.

## 6. Kubernetes Secrets

Create a secret in your cluster with all sensitive variables:

```bash
kubectl create secret generic docs-poc \
  --namespace docs \
  --from-literal=GITHUB_CLIENT_ID=Ov23li... \
  --from-literal=GITHUB_CLIENT_SECRET=abc123... \
  --from-literal=GITHUB_APP_ID=123456 \
  --from-literal=GITHUB_APP_PRIVATE_KEY='-----BEGIN RSA PRIVATE KEY-----\n...' \
  --from-literal=GITHUB_APP_INSTALLATION_ID=12345678 \
  --from-literal=DISCUSSIONS_COMMENTS_CATEGORY_ID=DIC_kwDO... \
  --from-literal=DISCUSSIONS_SUGGESTIONS_CATEGORY_ID=DIC_kwDO... \
  --from-literal=SESSION_SECRET=abc123def456abc123def456abc123de
```

## 7. Helm Deploy

Reference the secret in your Helm values:

```yaml
# helm/docs-poc/values.yaml
image:
  repository: ghcr.io/myorg/docs-poc
  tag: latest

envFrom:
  - secretRef:
      name: docs-poc

env:
  - name: GITHUB_REPO_OWNER
    value: "myorg"
  - name: GITHUB_REPO_NAME
    value: "docs-poc"
  - name: GITHUB_DOCS_ROOT
    value: "doc"
  - name: REGISTRY
    value: "ghcr.io/myorg"
```

Then deploy:

```bash
helm upgrade --install docs-poc ./helm/docs-poc \
  --namespace docs \
  --create-namespace \
  --wait
```

## 8. Updating Docs

When doc files change, the next deploy will automatically pick up the new content via the build-time `build:search` script, which indexes all markdown files in `GITHUB_DOCS_ROOT`.

**Option A: Automatic (recommended)**
- Push changes to your docs in the repository
- Trigger a new image build (via CI/CD or manually)
- Deploy the new image

**Option B: Decouple from deploy**
- Run the search index build locally:
  ```bash
  cd web && npm run build:search
  ```
- Commit the updated `public/search-index.json`
- Push to deploy the search index without rebuilding the entire image

---

## Troubleshooting

### "Unauthorized" when committing suggestions
- Verify `GITHUB_APP_PRIVATE_KEY` is correctly formatted (newlines as `\n`)
- Verify `GITHUB_APP_INSTALLATION_ID` matches the installed app on your repo

### Discussions categories not showing up
- Ensure both "Comments" and "Suggestions" categories exist
- Re-run the GraphQL query to get the correct node IDs
- Check that the IDs are stored in the correct env vars

### Search index is stale
- Run `npm run build:search` from the `web/` directory
- Commit and push `public/search-index.json`
- Or trigger a full image rebuild
