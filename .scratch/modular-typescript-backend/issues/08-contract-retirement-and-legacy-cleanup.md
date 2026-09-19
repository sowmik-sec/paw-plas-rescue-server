# 08: Contract Retirement and Legacy Cleanup

**What to build:** Decommissioning the monolithic JavaScript server file, pruning obsolete dependencies, and running end-to-end verification across the modernized server and client.

**Blocked by:** 02: Authentication, User Accounts, and Admin Role Seam, 03: Success Stories and Pet Categories, 04: Pet Catalog, Listing Management, and Cloudinary Seam, 05: Pet Adoption Request Workflow, 06: Donation Campaigns and Goal Tracking, 07: Stripe Payment Gateway and Donation Processing

**Status:** ready-for-agent

- [ ] Legacy monolithic `index.js` file is completely removed from the repository
- [ ] Obsolete dependencies from the previous CommonJS setup are pruned from `package.json`
- [ ] TypeScript compilation check passes on the server with zero errors (`tsc --noEmit`)
- [ ] Frontend client build succeeds with zero syntax or bundling errors (`npm run build`)
- [ ] Full end-to-end test suite passes across all domain modules and adapter seams
- [ ] Verification confirms no remaining callers reference legacy endpoint URLs across the client
