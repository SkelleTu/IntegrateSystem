# Aurora Diagnostics

The diagnostics collector stores a bounded per-trace event history and emits structured `AURORA_DIAGNOSTIC` logs. It detects missing transitions with an 8-second event barrier.

API router: `server/aurora-diagnostics-api.ts`.

Endpoints:
- `GET /api/diagnostics/aurora` — all active traces and recent events.
- `GET /api/diagnostics/aurora/:traceId` — complete stored trace.
- `POST /api/diagnostics/aurora/event` — record an event.
- `DELETE /api/diagnostics/aurora` — clear in-memory diagnostics.

The router must be mounted by Aura System's Express application. The Aurora Agent should post sanitized lifecycle events only; do not send raw microphone/audio payloads or full sensitive transcripts to this API.
