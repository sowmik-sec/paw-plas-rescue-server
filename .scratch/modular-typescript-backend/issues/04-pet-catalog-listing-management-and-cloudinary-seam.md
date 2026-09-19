# 04: Pet Catalog, Listing Management, and Cloudinary Seam

**What to build:** A complete pet listing lifecycle where pet owners can create, update, and delete pet listings with photo uploads, and adopters can browse available pets filtered by category with pagination.

**Blocked by:** 02: Authentication, User Accounts, and Admin Role Seam

**Status:** ready-for-agent

- [ ] Public pet catalog endpoint supports pagination and filtering by category, returning only pets available for adoption
- [ ] Pet details endpoint returns full pet information including age, location, owner contact, and current status
- [ ] Authenticated pet owners can create new pet listings with multipart image uploads stored via Cloudinary
- [ ] Authenticated pet owners can update details or replace photos for their existing listings
- [ ] Authenticated pet owners can delete their own pet listings
- [ ] Pet owners can retrieve all pets they have listed through their account dashboard
- [ ] Media storage adapter seam decouples Cloudinary so in-memory substitutes can be used in tests
- [ ] Frontend pet creation, editing, details, and owner dashboard views are updated to consume the new REST endpoints
- [ ] Automated tests verify catalog filtering, pagination limits, and media storage adapter operations
