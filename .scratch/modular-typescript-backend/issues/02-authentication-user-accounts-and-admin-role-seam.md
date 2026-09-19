# 02: Authentication, User Accounts, and Admin Role Seam

**What to build:** An end-to-end user authentication and account management flow where users can register, receive a signed JWT access token, and verify administrative status, with admin users able to list all accounts and assign admin privileges.

**Blocked by:** 01: Server Directory Rename, TypeScript Setup, and Core HTTP Seam

**Status:** ready-for-agent

- [ ] User registration endpoint idempotently saves new users or returns existing accounts without duplication
- [ ] JWT authentication endpoint issues signed tokens with expiration for valid user credentials
- [ ] Admin verification endpoint accurately reports whether an authenticated user has the admin role
- [ ] Admin users can retrieve a list of all registered accounts and promote accounts to admin status
- [ ] Authentication and admin authorization middlewares protect private routes and reject unauthorized requests with standard error messages
- [ ] Frontend authentication provider, admin hook, and user management dashboard page are updated to use the new endpoints
- [ ] Automated tests verify token generation, duplicate registration handling, and role permission enforcement
