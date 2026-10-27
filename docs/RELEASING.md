# Releasing a plugin

How an update reaches the store at **https://prophetcrab.github.io/dsh-plugins/index.json**.

## TL;DR

```sh
cd ~/project/dsh-live-preview        # the plugin's own repository
# ...edit code...

npm version patch --no-git-tag-version   # or edit "version" by hand
git add -A
git commit -m "feat: ..."
git tag v0.2.4                            # must equal the new version
git push origin main
git push origin v0.2.4

# Optional: do not wait for the six-hour schedule
gh workflow run refresh-index.yml -R prophetcrab/dsh-plugins
```

That is the whole release. `dsh-plugins` needs no edit — the workflow regenerates and commits
`docs/index.json` within six hours (or immediately when you dispatch it).

## What the generator needs from the repository

- Public repository, `package.json` with `dsh.bundle.patch` (the repo root, or a workspace package).
- `"private": true` must **not** be set — private packages are skipped.
- The tag `vX.Y.Z` must equal the `version` in `package.json` at that commit; a mismatched or non-SemVer
  tag is skipped.
- `engines.dsh` must admit the DSH version you run, or that version is skipped with a warning.
- Display metadata (all optional, otherwise fallbacks apply): `locale/en.json` + `locale/zh.json` with
  `meta.title` / `meta.description`, an `icon` field or `./icon` export, plus `author`, `homepage`,
  `repository`, `keywords`.

## Checking the result

```sh
# the version list the store serves
curl -s https://prophetcrab.github.io/dsh-plugins/index.json \
  | jq '.plugins[] | {name, versions: [.versions[].version]}'

# the workflow runs
gh run list --workflow=refresh-index.yml -R prophetcrab/dsh-plugins --limit 5
```

Pages needs about a minute after the bot commit before the URL above serves the new file.

## Adding a brand-new plugin

1. Create the repository, add the metadata above, push, tag `v0.1.0`.
2. Add the repository URL to `market/plugins.txt` in `dsh-plugins`.
3. Commit and push — a push touching `market/plugins.txt` triggers the workflow.
4. Check the URL above; the plugin should be listed.

## What is automatic and what is not

| Step | Who does it |
|---|---|
| Listing a new version in the index | the workflow, within six hours of the tag |
| Committing `docs/index.json` | the workflow (`github-actions[bot]`) |
| Installing or updating the plugin on a machine | **you**, in Settings → Plugins → Discover |
| Updating an already-installed profile | **you** — installed plugins never self-update |

## Local development loop

The two plugins in this account are installed in the Desktop profile as `file:` dependencies pointing at
`~/project/<name>`, so a code change needs one extra step to show up locally:

```sh
pnpm -C ~/.dsh/profiles/desktop install   # refresh the profile's copy
# then restart DeepSeek Harness: Host modules are imported once at startup
```

Client-only changes (`client.js`) also need a page refresh, which the restart covers.

## Pitfalls

- **Tags beat the default branch.** Once `vX.Y.Z` is tagged, later untagged commits do not change what that
  version points at — `dshtavern` in this store still lists the `v0.4.1` commit, not later `master` commits.
  If a change must reach the store, release a new version.
- **Pushing code without a version bump changes nothing** for a package whose current version is already
  tagged.
- GitHub pauses scheduled workflows after 60 days of repository inactivity; run the workflow once manually.
- `dsh-live-preview`'s `bin/window-list` helper is macOS arm64; its web preview is platform-neutral.
