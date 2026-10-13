# OmniTutor AI - Security Audit & Reliability Review

## 1. Executive Summary

This document presents the findings, threat models, remediations, and operational controls implemented during the comprehensive Security Audit & Reliability Hardening cycle (Module 11) of the OmniTutor AI platform.

OmniTutor AI processes multimodal educational assets (PDFs, DOCX, PPTX, TXT, Audio, Video), embeds them into vector collections (Qdrant), queries them with large language models (Google Gemini 2.0 Flash), and generates adaptive assessments and conversational tutor dialogues for students. The system operates on strict **zero-trust, least-privilege, and defense-in-depth principles**.

---

## 2. Threat Modeling & Vulnerability Matrix

| Threat Category | Vulnerability Identified | Risk Level | Remediated In | Implemented Mitigation |
|---|---|---|---|---|
| **Multi-Tenancy** | Cross-user citation / chunk extraction via `/rag/citations/resolve` | **HIGH** | `rag.service.ts` | Added `resolveChunkSource(chunkId, courseId, userId, userRole)` ownership check. Reject unauthorized cross-course queries with 403 Forbidden. |
| **ReDoS & Injection** | Unescaped regex characters in course search (`/courses?search=...`) | **MEDIUM** | `sanitize.ts`, `course.service.ts` | Implemented `safeSearchRegex(query)` with strict character escaping (`escapeRegExp`) and max-length bounds (100 chars). |
| **CSRF & Sessions** | State-changing cookie requests susceptible to cross-origin abuse | **HIGH** | `auth.ts`, `crypto.ts` | Implemented cryptographic double-submit HMAC CSRF validation with timing-safe comparison on state-modifying requests (`POST`, `PUT`, `PATCH`, `DELETE`). |
| **Prompt Injection** | Jailbreak directives inside curriculum questions | **HIGH** | `rag.service.ts`, `tutor.service.ts` | Query classifier detects adversarial patterns (`ignore previous instructions`, `DAN mode`, delimiter attacks) and strips synthetic delimiters before prompt compilation. |
| **Assessment Integrity**| Pre-submission leakage of answer keys & rubric solutions | **HIGH** | `assessment.service.ts` | Sanitizes questions before returning to students via `/assessments/:id`. Strips `correctAnswer`, `rubric`, and `explanation` until graded submission. |
| **Duplicate Billing / Scoring**| Rapid duplicate quiz submissions inflating scores | **MEDIUM** | `assessment.service.ts` | Added 15-second idempotent deduplication on `/assessments/:id/submit`. Intercepts repeat submissions and returns existing attempt record without duplicate scoring. |
| **Worker Fault-Tolerance**| Server crash leaving ingestion jobs stuck in `processing` | **MEDIUM** | `ingestion.worker.ts`, `app.ts` | Implemented `reconcileOrphanedJobs()` on startup: transitions stranded jobs to `failed` or retries transient jobs, resetting orphaned vector states. |
| **Permanent vs Transient Errors**| Non-recoverable file corruptions stuck in retry loops | **LOW** | `ingestion.worker.ts` | Categorized errors: corrupt zip files, scanned PDFs, and empty files trigger immediate terminal failure (`maxAttempts = 0`) to conserve AI credits. Transient network/vector errors use jittered exponential backoff. |
| **Infrastructure Disclosure**| `/health` and `/ready` endpoints exposing raw internal IPs | **LOW** | `qdrant.service.ts`, `health.service.ts` | Sanitized probe responses to reveal only cluster readiness status and sanitized hostnames (`localhost` or masked URI). |
| **Resource Exhaustion**| Unbounded AI generation endpoint abuse | **MEDIUM** | Route configurations | Implemented route-level rate limiting (20-30 req/min) on `/rag/query`, `/assessments/generate`, `/messages/stream`, and `/study-tools/*/generate`. |

---

## 3. Defense-in-Depth Implementation Details

### 3.1. Multi-Tenant Course Isolation & RBAC
- **Course Ownership:** All course modifications (`PATCH`, `DELETE`) verify `course.owner === userId` or require `role === 'admin'`.
- **RAG Vector Filtering:** Qdrant similarity searches enforce a strict filter payload: `{ must: [{ key: 'courseId', match: { value: courseId } }] }`. Cross-course vector bleeding is physically prevented at the query level.
- **Citation Provenance:** When a student requests source provenance (`POST /rag/citations/resolve`), the API validates course membership before returning raw chunk text, original filenames, or page coordinates.

### 3.2. File Upload & Magic-Bytes Security
- Uploaded files are strictly validated against magic byte signatures (`verifyFileSignatureAndLimits`) in `file-security.ts`.
- File extensions and client MIME headers are discarded; actual file signatures (PDF `%PDF-`, DOCX/PPTX `PK\x03\x04`, MP3 `ID3`, MP4 `ftyp`) govern processing.
- Strict payload caps:
  - Text & Markdown: 5MB
  - Documents (PDF, DOCX, PPTX): 25MB
  - Audio & Video (MP3, WAV, MP4): 50MB
- Decompression bomb and directory traversal (Zip Slip) checks protect all archive extractions.
- Scanned PDF detection prevents non-OCR images from silently generating zero embeddings.

### 3.3. Prompt Injection Defense
- Curriculum queries and student chat messages pass through `ragService.normalizeQuery()`.
- Patterns matching adversarial system overrides (`ignore all previous instructions`, `DAN`, `jailbreak`, `disregard rules`) trigger security telemetry warnings and are stripped of synthetic delimiters (`</curriculum_evidence>`, `[cite:]`).
- Retrieved curriculum excerpts are tagged as untrusted content inside isolated system blocks:
  ```xml
  <curriculum_evidence>
  [Retrieved content securely sandboxed from instruction tokens]
  </curriculum_evidence>
  ```

### 3.4. ReDoS & MongoDB Query Safety
- All dynamic query parameters (subject, search keywords, tags) are sanitized with `safeSearchRegex()`:
  ```typescript
  export function safeSearchRegex(raw: string, flags = 'i'): RegExp | null {
    const trimmed = raw.trim().slice(0, 100);
    if (!trimmed) return null;
    return new RegExp(escapeRegExp(trimmed), flags);
  }
  ```
- Special metacharacters (`.*+?^${}()|[]\`) are neutralized to prevent Regular Expression Denial of Service (ReDoS) or arbitrary regex execution.

### 3.5. Reliability & Startup Recovery
- **Idempotent Ingestion Deduplication:** `MaterialService.retryIngestion()` prevents duplicate active jobs if a job is already `queued` or `processing`.
- **Startup Reconciliation:** `ingestionWorker.reconcileOrphanedJobs()` runs on server initialization to clean up jobs left hanging after ungraceful pod restarts.
- **Transient Provider Backoff:** `gemini.provider.ts` and `qdrant.service.ts` apply bounded exponential retries with randomized jitter (up to 30s timeout) for rate-limited (429) and transient network (503, ETIMEDOUT) responses.

---

## 4. Automated Security & Reliability Test Suite

All security requirements are validated through continuous automated testing in `apps/api/tests/security-reliability.test.ts`:

1. **Course Ownership & Access Control:** 403 Forbidden on cross-student GET/PATCH/DELETE.
2. **Citation Source Isolation:** Unauthorized students blocked from resolving cross-course chunks.
3. **CSRF Enforcement:** Missing and forged CSRF tokens blocked with 403.
4. **Answer Key Protection:** Pre-submission quiz models stripped of correct answers.
5. **ReDoS Defense:** Complex regex patterns execute in <10ms without service degradation.
6. **Prompt Injection Classifier:** Malicious delimiters neutralized.
7. **Deduplication:** Rapid quiz re-submissions return cached evaluation results.
8. **Permanent Error Fast-Fail:** Malformed documents fail immediately without wasting API quotas.
9. **Startup Reconciliation:** Orphaned jobs cleanly reset.
10. **Sanitized Health Probes:** No internal infrastructure credentials disclosed.
11. **E2E Student Journey:** Full 9-step integration cycle completes cleanly.

---

## 5. Software Supply Chain, Dependency Audit & Accepted Risks

As part of the Module 11 security hardening gate, an automated dependency vulnerability audit is executed in CI via `npm audit --audit-level=high`. Below is the formal threat evaluation and accepted risk documentation for advisories flagged in upstream transitive packages:

| Package | Severity | Upstream Source | Attack Vector & Exposure Analysis | Risk Decision & Controls |
|---|---|---|---|---|
| `tinypool` / `@vitest/mocker` | Critical / Moderate | Dev dependency (`vitest`) | Prototype pollution gadget in test worker options. Exposure is strictly isolated to developer workstations and CI runners during `vitest run`. Never bundled or deployed to production Node.js containers or browser builds. | **ACCEPTED (Dev-only)**: Zero production impact. Upgrading requires Vitest v5 breaking major version bump. |
| `braces` / `postcss-selector-parser` | High / Moderate | Dev dependency (`tailwindcss`) | Stack exhaustion / quadratic complexity during CSS compilation. Executed exclusively during offline build-time (`npm run build`). No untrusted dynamic user CSS is parsed at runtime. | **ACCEPTED (Build-time)**: Zero production runtime exposure. Retained for Tailwind v3 LTS stability. |
| `react-router` / `react-router-dom` (v6.29.0) | Moderate | Runtime dependency (`apps/web`) | Open redirect via backslash in `<Link>` / `useNavigate` (CVE-2025-68470) and SSR hydration deserialization. OmniTutor AI operates as a purely client-side SPA (no SSR hydration in use) with strictly hardcoded application routes. Dynamic external redirect destinations are prohibited. | **ACCEPTED (Managed SPA)**: Inherent mitigations in place. Planned upgrade path to React Router v7 scheduled for subsequent maintenance cycle. |
| `undici` (v7.29.0) | High | Transitive runtime (`@qdrant/js-client-rest`) | Denial of Service in WebSocket permessage-deflate and shared cache cookie disclosure. OmniTutor API interacts with Qdrant exclusively via outbound HTTP REST on an isolated Docker network (`http://qdrant:6333`). No public WebSockets or shared HTTP proxy caches are utilized for Qdrant client communication. | **ACCEPTED (Internal Network)**: Network isolation eliminates public attack surface. Overrides evaluated and locked. |

---

## 6. Verification Results & Audit Evidence

| Gate / Suite | Scope | Executed Command | Results |
|---|---|---|---|
| **TypeScript Typecheck** | `@omnitutor/shared`, `@omnitutor/api`, `@omnitutor/web` | `npm run typecheck` | **PASS (0 errors)** |
| **Monorepo Linting** | `@omnitutor/shared`, `@omnitutor/api`, `@omnitutor/web` | `npm run lint` | **PASS (0 errors)** |
| **API Test Suite** | 12 test files across Modules 1–11 | `npm run test:api` | **PASS (88 / 88 tests)** |
| **Web Test Suite** | Application shell, courses, tutor, citations, assessments | `npm run test:web` | **PASS (16 / 16 tests)** |
| **Production Build** | Shared package, Fastify API server, Vite React SPA | `npm run build` | **PASS (100% build output generated)** |
| **Security Negative Tests** | RBAC, cross-tenant isolation, CSRF, prompt injection, ReDoS | `vitest run security-reliability.test.ts` | **PASS (12 / 12 tests)** |
| **Database Initializer** | Synchronize 81 indexes across 15 collections | `npm run db:init` | **PASS (Clean index reconciliation)** |

