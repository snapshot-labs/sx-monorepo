---
'@snapshot-labs/sx': patch
---

Build with TypeScript 7 compatible tsconfigs (`moduleResolution: Bundler`, explicit `rootDir`). The published JavaScript is unchanged; one declaration file now references `SignatureData` through the package root instead of `./types`.
