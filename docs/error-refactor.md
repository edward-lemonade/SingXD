Error layer refactor

Goal
- Introduce a centralized application error abstraction and mapping so transports (HTTP/gRPC) return safe, consistent messages while services can keep sentinel/domain errors small and implementation-focused.

What I added and kept
- `backend/internal/apperror/apperror.go`
  - `AppError` struct with `Code`, `Message`, `HTTP`, `GRPC`, and wrapped `Err`.
  - `New`, `WithCause`, `ToHTTP`, `ToGRPC`, and `ServiceError` helpers for transport-safe mapping.

- Domain-owned sentinel errors
  - The project keeps sentinel errors in their owning domains (for example `backend/internal/domain/auth/errors.go` and the game service domain package) rather than a centralized `internal/errors/*` folder, which preserves the domain boundary and keeps ownership explicit.

- Centralized transport mapping by default
  - `apperror` exposes typed constructors such as `Internal`, `Unauthenticated`, `InvalidInput`, and `NotFound`.
  - Service handlers can now call `apperror.ServiceError(c, err)` without duplicating HTTP response construction logic.

- Documentation and rollout notes
  - This refactor is now described in the planning and runbook docs, and the API gateway + game-service split is operationally documented in the same docs set.

Current state
- The error layer is centralized and stable enough for the existing gateway + game-service split.
- The project no longer needs the legacy `internal/transport/errors.go` path for the main handler flows.
- Remaining follow-up work is operational rather than architectural: staging validation, canary rollout, and shared monitoring dashboards.

Files changed
- Added: `backend/internal/apperror/apperror.go`
- Added: `backend/internal/errors/game/errors.go`
- Deleted: `backend/internal/service/gameerrors/errors.go`
- Updated: `backend/internal/transport/errors.go` (now uses apperror + legacy fallback)
- Updated: `backend/internal/handler/game.go` imports to use `internal/errors/game`

Notes & migration guidance
- Services should return either:
  - An `*apperror.AppError` via `apperror.Wrap(err, code, message, http, grpc)` when they want to control transport codes and messages directly, or
  - Sentinel domain errors (e.g., `errors.Is(err, errorsgame.ErrVocalsUnavailable)`) and let transport fallback mapping handle them.

- Recommended next steps:
  1. Convert other domain sentinel packages to live under `internal/errors/<domain>` (optional but cleaner).
  2. Gradually wrap critical service boundary errors with `apperror.Wrap` to provide richer transport metadata.
  3. Optionally replace the legacy `legacyMap` with a registration API in `apperror` if you prefer centralized mapping.

Note: The repository now includes a default registration (`internal/apperror/register_defaults.go`) that maps existing sentinel errors from the current service packages to HTTP and gRPC codes. Over time you can move these sentinel definitions into `internal/errors/<domain>` and update the registrations accordingly.

*** End of doc
