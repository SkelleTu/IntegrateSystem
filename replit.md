# Aura System (Windows Version) Fixes

## Module System Alignment
- Changed `script/build.ts` to output CommonJS (`cjs`) instead of ESM.
- Electron and the existing `package.json` are configured for CommonJS, so the build must match.
- Updated `outExtension` to `.cjs` to be explicit.

## Server Startup
- Modified `server/index.ts` to always start the HTTP server, even in production mode.
- This ensures that when the Electron app starts, the Express server is already listening on port 5000, preventing `ERR_CONNECTION_REFUSED`.

## Package Configuration
- Updated `package.json` start script to point to `dist/index.cjs`.
- Kept `"type": "module"` in `package.json` for the development environment (which uses `tsx`), but the production build is now correctly handled as CommonJS for the packed application.

## Verification
- Run `npm run build` to generate the new `dist/index.cjs`.
- The application should now start without syntax errors and connect to the local server correctly.
