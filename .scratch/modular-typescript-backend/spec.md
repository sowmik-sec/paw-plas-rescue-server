# Spec: Modular TypeScript Backend Migration with Prisma and RESTful Contracts

## Problem Statement

As a developer and maintainer of the Paw Pals Rescue platform, working with the existing backend is error-prone, hard to navigate, and difficult to test. The entire backend is implemented in a single 1,035-line JavaScript file with no static typing, no automated tests, mixed-casing and inconsistent route endpoints, and unhandled errors that can crash the server process. Raw MongoDB aggregation pipelines and third-party vendor SDKs (Stripe, Cloudinary) are directly intertwined with HTTP handlers, preventing offline development and automated testing.

## Solution

Migrate the backend to a modular TypeScript architecture structured into cohesive deep modules (`User`, `Pet`, `Campaign`, `Donation`, `Story`) with a declarative Prisma schema for MongoDB. Establish explicit seams at the HTTP transport boundary with standardized RESTful routes (`/api/v1/...`) and at external I/O boundaries using substitutable adapters for Stripe and Cloudinary. Provide centralized authentication, authorization, and Zod validation at the perimeter, and align the frontend client to consume the new RESTful contracts.

## User Stories

1. As an Adopter, I want to browse available Pets filtered by category and paginated, so that I can easily discover animals looking for a home.
2. As an Adopter, I want to view detailed information about a Pet including age, location, description, photo, and owner details, so that I can make an informed adoption decision.
3. As an Adopter, I want to submit an Adoption Request with my contact details and address for an available Pet, so that the owner can review my application.
4. As an Adopter, I want to track the status of my Adoption Requests, so that I know whether my application is pending or accepted.
5. As a Pet Owner, I want to list a rescued Pet with photos, category, and health details, so that potential adopters can find it.
6. As a Pet Owner, I want to update an existing Pet listing and upload a replacement photo, so that information remains accurate.
7. As a Pet Owner, I want to delete a Pet listing that is no longer needed, so that outdated listings do not clutter the platform.
8. As a Pet Owner, I want to review all Adoption Requests submitted for my listed Pets, so that I can select suitable adopters.
9. As a Pet Owner, I want to mark an Adoption Request as adopted, so that the Pet is officially placed and excluded from public search listings.
10. As a Donor, I want to explore active Donation Campaigns with their target amounts, deadlines, and current raised totals, so that I can decide which causes to support.
11. As a Donor, I want to view a specific Donation Campaign with the breakdown of previous contributions and the creator profile, so that I have trust in the fundraiser.
12. As a Donor, I want to generate a Stripe payment intent and complete a secure donation to a campaign, so that the campaign receives my financial assistance.
13. As a Donor, I want to view my personal donation history across all campaigns with timestamps and amounts, so that I can track my philanthropic contributions.
14. As a Campaign Creator, I want to create a new Donation Campaign with a target goal, expiration date, photo, and story, so that I can raise funds for pet medical or shelter needs.
15. As a Campaign Creator, I want to monitor the total funds raised and list of Donors for my campaigns in my dashboard, so that I can track campaign progress.
16. As a User, I want to register or log in using social credentials and receive a signed JWT access token, so that I can make authenticated requests across the platform.
17. As a User, I want to read community Success Stories celebrating completed adoptions, so that I feel inspired by positive rescue outcomes.
18. As an Admin, I want to view all registered platform Users, so that I can monitor user activity and manage community access.
19. As an Admin, I want to promote a registered User to an Admin role, so that administrative duties can be shared.
20. As an Admin, I want to inspect all platform-wide Donation Campaigns and their financial metrics, so that I can audit fundraising activities.
21. As an Admin, I want to view all individual Donations across the platform with donor emails and amounts, so that financial transparency is maintained.
22. As a Developer, I want strong compile-time type validation across domain modules, so that data inconsistencies and missing attributes are caught prior to runtime.
23. As a Developer, I want all input payloads validated against Zod schemas at the transport seam, so that malformed requests return structured 400 errors instead of crashing the server.
24. As a Developer, I want third-party payment and storage providers behind interfaces, so that I can run the full test suite locally without network access or live API secrets.

## Implementation Decisions

### Modular Architecture
- The backend will be partitioned into five autonomous domain modules:
  - `UserModule`: Handles user registration, profile lookups, JWT token creation, and admin status checks.
  - `PetModule`: Manages pet listings, categories, adoption requests, and status workflow transitions.
  - `CampaignModule`: Manages donation campaigns, target amounts, expiration dates, and donor aggregations.
  - `DonationModule`: Manages Stripe payment intents, donation persistence, and donor history lookups.
  - `StoryModule`: Manages adoption success stories and pet category references.
- Each domain module is organized into explicit internal roles:
  - Transport Router: defines Express routes and middleware bindings.
  - Controller: extracts request parameters and maps service responses to HTTP status codes.
  - Service: executes domain operations and enforces business invariants.
  - Repository: encapsulates Prisma ORM queries and multi-document operations.
  - Validation Schemas: declares Zod schemas for request validation.

### Language & Runtime Tooling
- The codebase will migrate from JavaScript CommonJS to TypeScript targeting Node 20+.
- Development runtime will use `tsx watch` for hot-reloading without separate compile steps.
- Production builds will compile to standard JavaScript via `tsc` into the `dist/` directory.
- The server directory name will be corrected from `paw-plas-rescue-server` to `paw-pals-rescue-server`.

### Database & Schema Management
- The data layer will migrate from raw `mongodb` driver queries to Prisma ORM with the MongoDB connector (`provider = "mongodb"`).
- Models will define MongoDB ObjectIds via `@id @default(auto()) @map("_id") @db.ObjectId`.
- Multi-document aggregations (e.g., calculating campaign totals and donor lists) will be encapsulated inside module repositories.

### API Standardization & Versioning
- All endpoints will transition from flat legacy routes to standard RESTful conventions prefixed with `/api/v1`:
  - Auth & Users:
    - `POST /api/v1/auth/jwt`
    - `POST /api/v1/users`
    - `GET /api/v1/users` (Admin)
    - `GET /api/v1/users/admin-status/:email`
    - `PATCH /api/v1/users/:id/role` (Admin)
  - Pets & Adoptions:
    - `GET /api/v1/pets`
    - `GET /api/v1/pets/:id`
    - `POST /api/v1/pets` (Multipart with image)
    - `PUT /api/v1/pets/:id` (Multipart with optional image)
    - `DELETE /api/v1/pets/:id`
    - `GET /api/v1/pets/owner/me`
    - `GET /api/v1/pets/categories`
    - `POST /api/v1/pets/:id/adoption-requests`
    - `GET /api/v1/pets/adoption-requests`
    - `PATCH /api/v1/pets/adoption-requests/:id/adopt`
  - Donation Campaigns:
    - `GET /api/v1/campaigns`
    - `GET /api/v1/campaigns/:id`
    - `POST /api/v1/campaigns` (Multipart with image)
    - `GET /api/v1/campaigns/user/me`
    - `GET /api/v1/campaigns/admin/all`
  - Donations:
    - `POST /api/v1/donations/payment-intent`
    - `POST /api/v1/donations`
    - `GET /api/v1/donations/user/me`
    - `GET /api/v1/donations/campaign/:campaignId/total`
    - `GET /api/v1/donations/admin/all`
  - Stories:
    - `GET /api/v1/stories`
    - `GET /api/v1/stories/:id`
- All corresponding Axios calls in `paw-pals-rescue-client` will be updated to match the new endpoints.

### External Adapters & Seams
- A `PaymentGateway` interface will decouple Stripe:
  - Production adapter: `StripePaymentAdapter` using the `stripe` Node SDK.
  - Test adapter: `FakePaymentAdapter` returning deterministic client secrets in-memory.
- A `MediaStorage` interface will decouple Cloudinary:
  - Production adapter: `CloudinaryMediaAdapter` using Multer Cloudinary storage.
  - Test adapter: `MemoryMediaAdapter` simulating file uploads in-memory.

### Error Handling & Security
- A custom `AppError` class hierarchy (`NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`) will represent domain and HTTP errors.
- A centralized Express error middleware will capture all thrown errors and format consistent JSON responses: `{ success: false, message: string }`.
- Authentication middleware will verify Bearer tokens and attach the authenticated user payload to the Express request object.
- Role authorization middleware will verify admin status before allowing access to administrative routes.

## Testing Decisions

### Seam Discipline & Test Strategy
- The primary test seam is the **Domain Module Service Interface**. Tests will exercise business rules (e.g. pet adoption status transitions, donation recording, campaign total calculations) by invoking the service directly.
- Tests will strictly test external behavior and invariants, not internal query implementation details.
- Unit and integration tests will substitute database and third-party adapters with in-memory test doubles (`FakePaymentAdapter`, `MemoryMediaAdapter`, in-memory repository doubles).
- HTTP transport contract tests (using Supertest) will verify that authentication, authorization, and Zod input validation reject invalid inputs with appropriate 400/401/403 status codes.

### Scope of Automated Tests
- `UserModule`: Tests verifying token generation, duplicate registration idempotency, and admin role checking.
- `PetModule`: Tests verifying listing pagination, filtering by category, pet creation, adoption request creation, and transition to adopted status.
- `CampaignModule`: Tests verifying campaign creation, remaining days calculation, and aggregation of raised amounts.
- `DonationModule`: Tests verifying payment intent generation, donation persistence, and user donation summary grouping.

## Out of Scope

- Changing the frontend UI framework or CSS styling (React, Tailwind CSS, TanStack Query remain as-is).
- Implementing new frontend UI features or redesigning platform pages.
- Replacing MongoDB with a relational SQL database.
- Replacing Stripe with another payment provider.
- Implementing webhook listeners for Stripe charge events (retains existing direct payment confirmation flow).

## Further Notes

- The decision to migrate to TypeScript, Prisma ORM, and RESTful `/api/v1` routes is formally recorded in ADR-0001 (`docs/adr/0001-modular-typescript-backend-with-prisma-and-rest.md`).
- Domain language definitions for `Pet`, `Adoption Request`, `Donation Campaign`, `Donation`, `Donor`, `Adopter`, `Success Story`, and `User` are maintained in `CONTEXT.md`.
