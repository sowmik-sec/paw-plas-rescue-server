# 02: Authentication, User Accounts, and Admin Role Seam

**What to build:** An end-to-end user authentication and account management flow where users can register, receive a signed JWT access token, and verify administrative status, with admin users able to list all accounts and assign admin privileges.

**Blocked by:** 01: Server Directory Rename, TypeScript Setup, and Core HTTP Seam

**Status:** completed

- [x] User registration endpoint idempotently saves new users or returns existing accounts without duplication
- [x] JWT authentication endpoint issues signed tokens with expiration for valid user credentials
- [x] Admin verification endpoint accurately reports whether an authenticated user has the admin role
- [x] Admin users can retrieve a list of all registered accounts and promote accounts to admin status
- [x] Authentication and admin authorization middlewares protect private routes and reject unauthorized requests with standard error messages
- [x] Frontend authentication provider, admin hook, and user management dashboard page are updated to use the new endpoints
- [x] Automated tests verify token generation, duplicate registration handling, and role permission enforcement
