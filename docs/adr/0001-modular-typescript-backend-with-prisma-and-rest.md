# 0001. Modular TypeScript Backend with Prisma and RESTful Endpoints

## Context & Decision

The backend previously operated as a single 1,035-line JavaScript script (`index.js`) combining routing, MongoDB aggregation pipelines, authentication, and external SDKs with flat, ad-hoc URL paths.

We decided to restructure the backend into a **Feature-Based Deep Modules Architecture in TypeScript**, backed by **Prisma ORM** for schema definition and type-safe database queries. Additionally, all API routes are standardized into a unified RESTful contract (`/api/v1/...`), with external I/O (Stripe, Cloudinary) isolated behind testable adapter seams.

## Considered Options

- **Layered Architecture (Controllers -> Services -> Repositories across the whole app)**: Rejected because it creates shallow pass-through layers and poor locality across features.
- **Native MongoDB Driver without ORM**: Rejected in favor of Prisma to gain compile-time type generation and declarative schema validation.
- **Preserving Flat Legacy URLs**: Rejected in favor of modern RESTful routes to establish a clean, predictable API surface, accepting the one-time migration cost of updating frontend call sites.

## Consequences

- Each domain capability (`pets`, `campaigns`, `donations`, `users`, `stories`) is self-contained with its own routes, controller, service, repository, and Zod schemas.
- External services (Stripe, Cloudinary) can be swapped or faked during testing without touching business logic.
- The frontend client (`paw-pals-rescue-client`) endpoints must be updated to match the new RESTful paths.
