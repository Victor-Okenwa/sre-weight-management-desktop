# Windows release & auto-update

App version comes from [`package.json`](./package.json) (`1.1.1` currently). `electron-updater` reads GitHub Releases for `Victor-Okenwa/weight-management-desktop` (private).

## Tokens

| Env var | Who uses it | Scope |
|---------|-------------|--------|
| `GH_TOKEN` | electron-builder publish | Create/upload GitHub Releases |
| `UPDATE_GH_TOKEN` | Baked into the installed app | Fine-grained PAT, **Contents: Read** on this repo only |

`UPDATE_GH_TOKEN` is written into the binary by `scripts/inject-update-token.mjs` before packaging. It can be extracted from the app — rotate it if leaked, and plan a license-gated update feed later.

Never commit either token. Local `.env` / `.env.local` are gitignored.

## Ship a build (no publish)

```bash
# optional: export UPDATE_GH_TOKEN=ghp_...
pnpm dist:win
```

Installer lands in `apps/desktop/release/`.

## Publish a release

1. Bump `version` in `apps/desktop/package.json` (and root `package.json` if you keep them aligned).
2. Set tokens in the shell:

```bash
export GH_TOKEN=...          # publish
export UPDATE_GH_TOKEN=...   # read-only, baked for clients
```

3. Build renderer + desktop and publish:

```bash
pnpm release:win
```

That uploads the NSIS installer and `latest.yml` to GitHub Releases. Clients on an older version see the update under **Settings → About**.

## Notes

- Windows only (NSIS). No code signing in this setup — SmartScreen may warn until you add a certificate.
- Auto-update is disabled in unpackaged `pnpm dev` builds.
