# 06: Donation Campaigns and Goal Tracking

**What to build:** Creation, discovery, and tracking of time-bounded fundraising campaigns for rescued pets, showing goal amounts, deadlines, and aggregated donation totals.

**Blocked by:** 02: Authentication, User Accounts, and Admin Role Seam, 04: Pet Catalog, Listing Management, and Cloudinary Seam

**Status:** ready-for-agent

- [ ] Authenticated campaign creators can create donation campaigns with target amounts, deadlines, descriptions, and uploaded images
- [ ] Public campaigns endpoint returns paginated campaigns with total funds raised and remaining days calculated
- [ ] Campaign details endpoint provides comprehensive information including previous contributions and creator details
- [ ] Campaign creators can view all campaigns they have initiated from their dashboard
- [ ] Administrators can view all platform-wide campaigns and their financial progress
- [ ] Frontend campaign creation, browsing, details, creator dashboard, and admin campaign views are updated to consume the new REST endpoints
- [ ] Automated tests verify campaign creation, remaining days calculation, and aggregation logic
