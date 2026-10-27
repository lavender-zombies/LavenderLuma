# npm Trusted Publishing

The npm publish workflows use GitHub Actions OIDC instead of a long-lived
`NPM_TOKEN`. Each package must have a matching Trusted Publisher entry on npm
before its first publish after this migration.

For each package (`@lavenderluma/sdk`, `@lavenderluma/ui`, and `@lavenderluma/mcp`), open
the package's npm settings and add a **GitHub Actions** trusted publisher with:

| Field | Value |
| --- | --- |
| Organization or user | `LavenderLuma` |
| Repository | `LavenderLuma` |
| Workflow filename | The exact filename below |
| Environment | `LavenderLuma` |

| Package | Workflow filename |
| --- | --- |
| `@lavenderluma/sdk` | `sdk-npm-publish.yml` |
| `@lavenderluma/ui` | `ui-npm-publish.yml` |
| `@lavenderluma/mcp` | `mcp-npm-publish.yml` |

The workflow job keeps the `LavenderLuma` GitHub Environment, so the environment
field must match exactly. The workflows grant `id-token: write`, use Node 24
(which provides a recent enough npm CLI), and publish with provenance. They do
not read `NPM_TOKEN`.

After all three entries are saved, rerun the failed workflow runs. Once a
successful publish is confirmed for every package, the obsolete `NPM_TOKEN`
environment secret can be removed from GitHub Actions settings.
