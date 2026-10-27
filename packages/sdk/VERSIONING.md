# @lavenderluma/sdk Versioning

The SDK follows SemVer for its public package surface:

- Exported runtime values and classes from `@lavenderluma/sdk`.
- Exported types from `@lavenderluma/sdk` and `@lavenderluma/sdk/types`.
- Supported subpath exports: `client`, `messages`, `events`, `errors`, `actions`, `types`, and `node`.
- Runtime behavior of typed client helpers, message builders, event helpers, and SDK error classes.

## Version policy

SDK and application versions are synchronized by `pnpm bump <version>` from the repository root.

The current Node.js requirement is `^24.22.1 || >=26.12.1`. Use the repository's `.node-version` for development and builds.

The SDK is an ES module package that supports native Node.js imports and bundler consumers. Its build uses `NodeNext`; relative source imports and re-exports must use `.js` specifiers so both emitted JavaScript and declarations resolve without a bundler. Package tests compile fresh output, load every runtime entry point with Node.js, and typecheck consumers with both NodeNext and bundler resolution.

- Major: removes or changes a public export, changes runtime behavior incompatibly, changes supported Node version, or removes/changes an existing package subpath.
- Minor: adds new public API or package subpaths, supports new LavenderLuma actions, adds optional parameters, or adds error subclasses.
- Patch: fixes bugs, improves docs, narrows implementation details without breaking public types, or updates action metadata without changing call signatures.

## Release Checklist

1. Run `pnpm bump <version>` to update all workspace versions.
2. Update `packages/sdk/CHANGELOG.md`.
3. Run `pnpm --filter @lavenderluma/sdk typecheck`.
4. Run `pnpm --filter @lavenderluma/sdk test`.
5. Run `pnpm --filter @lavenderluma/sdk build`.
6. Run `pnpm --filter @lavenderluma/sdk pack --dry-run` to inspect published files.

## Publishing to npm

Publishing is manual: run the steps above, then `npm publish` from `packages/sdk`.
The automated `sdk-npm-publish.yml` workflow was removed, so no OIDC trusted
publisher or `NPM_TOKEN` secret is configured for this repository.

If the package version already exists on npm, bump `packages/sdk/package.json`
before publishing.

## Action Compatibility

`LAVENDERLUMA_ACTIONS`, `isLavenderLumaAction`, and `LavenderLumaKnownAction` are available from both `@lavenderluma/sdk` and `@lavenderluma/sdk/actions`. The catalog includes this release's executable action names, compatibility aliases, and raw actions. OneBot's registry tests verify that the SDK catalog stays aligned with the server; the published SDK does not import server code.

This local catalog is not a capability check against a connected server. Every known action name has a parameter and result entry in `LavenderLumaActionMap`, including aliases. Existing broad JSON contracts are retained for compatibility. New parameter types describe accepted input forms, including numeric strings and primitive coercions; server-side range and state validation still applies. Custom actions and dynamically selected names remain supported through `raw()` and `rawResponse()`. Adding an action type is a minor change unless it changes an existing method signature or return type.

Stream result types describe individual frame payloads, including intermediate and terminal frames. Both built-in clients support `requestStream()` (envelopes) and `stream()` (payloads with API error handling), plus incremental file upload/download helpers; see [STREAMING.md](STREAMING.md). Existing `request()`, `call()`, `raw()`, `rawResponse()` and `downloadFile()` keep their single-response contracts. Custom subclasses that only implement `request()` remain valid; the default `requestStream()` explicitly reports unsupported streaming. Stream reset/error envelopes retain their existing error behavior. Album counts and IDs returned as decimal strings stay strings, and ordinary message IDs remain signed numbers.

The package consumer tests check complete action-map coverage, inferred results, compatibility aliases, and invalid input examples with both NodeNext and bundler resolution. The same parameter examples are checked against the server's real action parsers without starting QQ or executing actions.

Additive media-send methods, explicit quoted replies, and WebSocket event waits are described in [MESSAGING.md](MESSAGING.md). Existing string paths, ordinary `reply()` behavior, and handler/context types remain supported. The optional `node` subpath owns local filesystem access; browser-facing entry points stay free of Node imports. The runtime also propagates group-file chat publication failures instead of returning success after a failed publication; successful action response shapes are unchanged.
