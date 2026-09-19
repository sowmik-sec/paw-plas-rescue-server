# 05: Pet Adoption Request Workflow

**What to build:** The adoption application workflow where authenticated adopters can submit requests for available pets, pet owners can review requests, and approved requests mark pets as adopted and remove them from available search listings.

**Blocked by:** 04: Pet Catalog, Listing Management, and Cloudinary Seam

**Status:** completed

- [x] Authenticated adopters can submit an adoption request with address and contact information for an available pet
- [x] Pet owners and administrators can retrieve all pending and approved adoption requests
- [x] Approving an adoption request transitions its status to adopted and marks the pet as adopted
- [x] Adopted pets are automatically excluded from the public pet search catalog
- [x] Double-adoption validation prevents submitting new adoption requests for already adopted pets
- [x] Frontend adoption modal and adoption requests dashboard view are updated to consume the new REST endpoints
- [x] Automated tests verify adoption status transitions and validation preventing duplicate adoption
