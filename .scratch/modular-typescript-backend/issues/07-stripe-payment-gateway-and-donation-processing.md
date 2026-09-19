# 07: Stripe Payment Gateway and Donation Processing

**What to build:** Secure donation payment processing through Stripe and donor contribution tracking, allowing users to donate to active campaigns and inspect their personal donation history.

**Blocked by:** 06: Donation Campaigns and Goal Tracking

**Status:** ready-for-agent

- [ ] Payment intent endpoint securely generates a Stripe client secret for valid donation amounts
- [ ] Donation confirmation endpoint records successful contributions linked to a campaign and donor email
- [ ] Authenticated donors can view their complete donation history across campaigns with dates and amounts
- [ ] Campaign donation total endpoint returns aggregated funds for a specific campaign
- [ ] Administrators can inspect all individual donations platform-wide
- [ ] Payment gateway adapter seam decouples Stripe, allowing deterministic in-memory testing without network I/O
- [ ] Frontend donation modal and personal donation history dashboard are updated to consume the new REST endpoints
- [ ] Automated tests verify payment intent generation, donation persistence, and donor summary grouping
