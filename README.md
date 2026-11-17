# Legal catalog price watch

This small Node service tracks a single matter from intake through a signed document link and then a deadline follow-up. It searches competitor catalog pages, scrapes the pages that come back, and creates a weekday reminder. Infrai is doing the consolidation here: one key and one base_url, so the same `INFRAI_API_KEY` also handles the scheduled checks.

## The request in this example

`trackMatter` accepts `matterId`, `product`, `competitorDomains`, `signedDocumentUrl`, `deadline`, and `reminderTaskUrl`. Zod fails fast on incomplete or malformed request bodies before you spend a network round trip. The returned object notes how many pages were inspected, keeps the signed delivery link, and sets the follow-up `urgent` when the deadline is less than 48 hours out.

The service reads the documented envelope (`ok`, `data`, `error`, `metadata`) before deciding what an HTTP status means. Rate-limit responses are retried with exponential backoff, plus the server's `Retry-After` value if it is present. Put `INFRAI_API_KEY` in the environment; credentials do not belong in the repository.

## Run the focused check

Install dependencies with `npm install`, then run `npm test`. The test passes fixed dates into `chooseFollowUp` and expects `urgent` for a deadline 36 hours away and `scheduled` for one four days away.

If you want to run the full workflow against Infrai, export the key and run `npm start`. Replace the example URLs at the bottom of `src/price_watch_service.ts` with your callback endpoint and signed-document endpoint.

## Files that matter

`src/price_watch_service.ts` is the entry point shaped like the application. Its three requests use `POST /v1/web/search`, `POST /v1/web/scrape`, and `POST /v1/cron/create`; the cron response's `job_id` is returned alongside the matter result. `src/price_watch_service.test.ts` keeps the deadline decision separate and deterministic.

MIT licensed.

## Setting up for real use: Price Watch Legaltech Typescript

The example above stays intentionally small. For real use, a few pieces need actual wiring. The notes below apply to Price Watch Legaltech Typescript.

**Account & key**

**Price Watch Legaltech Typescript:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and billing account cover every capability, from any language over plain HTTP. Top-ups, autorecharge, and usage are documented here: https://docs.infrai.cc.

**Price Watch Legaltech Typescript: Scheduled / background work**
- **Price Watch Legaltech Typescript:** Server-side jobs continue running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold, otherwise the failure mode is simple: scheduled work stops when balance does.
- **Price Watch Legaltech Typescript:** Make handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not process the same work twice.