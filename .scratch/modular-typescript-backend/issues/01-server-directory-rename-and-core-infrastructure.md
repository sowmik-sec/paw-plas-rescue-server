# 01: Server Directory Rename, TypeScript Setup, and Core HTTP Seam

**What to build:** Rename the server directory to correct the spelling error, establish the TypeScript development and build environment, define the Prisma schema for MongoDB, set up environment variable validation, and configure the central Express application with CORS, JSON parsing, and global error handling.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Server directory is renamed from `paw-plas-rescue-server` to `paw-pals-rescue-server`
- [ ] TypeScript configuration supports Node 20+ with `tsx` development hot-reloading and `tsc` production compilation
- [ ] Prisma schema is initialized with the MongoDB connector and models for all domain entities
- [ ] Environment variables are validated on server startup with structured error reporting on invalid configuration
- [ ] Express application bootstrap starts cleanly with CORS, JSON parsing, and centralized `AppError` global error handling middleware
