Error layer refactor

Goal
- Introduce a centralized application error abstraction and mapping so transports (HTTP/gRPC) return safe, consistent messages while services can keep sentinel/domain errors small and implementation-focused.

What I added
- `backend/internal/apperror/apperror.go`
  - `AppError` struct with `Code`, `Message`, `HTTP`, `GRPC`, and wrapped `Err`.
  - `New`, `Wrap`, `ToHTTP`, and `ToGRPC` helpers to create and map errors.

- `backend/internal/errors/game/errors.go`
  - Moved the game sentinel errors out of `internal/service` into `internal/errors/game` to avoid coupling implementation packages to transport mapping.

- Updated transport mapping: `backend/internal/transport/errors.go`
  - Now uses `apperror.ToHTTP(err)` to prefer structured metadata returned by services.
  - Uses a registry of sentinel mappings registered at startup. `apperror` exposes `Register(...)` and a default mapping is provided in `internal/apperror/register_defaults.go`.

- Removed misplaced package: `backend/internal/service/gameerrors` (deleted).

- Documentation: `docs/error-refactor.md` describing the changes and rationale.

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
