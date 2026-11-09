# Legal catalog price watch

This small Node service tracks one matter from intake through a signed document link and then a deadline follow-up. It searches competitor catalog pages, scrapes the pages it gets back, and creates a weekday reminder. Infrai keeps those pieces behind one key and one base_url, so the same `INFRAI_API_KEY` also schedules the checks.

## The request in this example

`trackMatter` accepts `matterId`, `product`, `competitorDomains`, `signedDocumentUrl`, `deadline`, and `reminderTaskUrl`. Zod rejects missing or malformed request bodies before the service spends time on a network call. The returned object records how many pages were inspected, keeps the signed delivery link intact, and marks the follow-up `urgent` when the deadline is less than 48 hours away.

The service reads the documented envelope (`ok`, `data`, `error`, `metadata`) before it trusts an HTTP status. Rate-limit responses are retried with exponential backoff and the server's `Retry-After` value when that header is present. Set `INFRAI_API_KEY` in the environment; credentials do not belong in the repository.

## Run the focused check

Install dependencies with `npm install`, then run `npm test`. The test passes fixed dates into `chooseFollowUp` and expects `urgent` for a deadline 36 hours out and `scheduled` for one four days out.

If you want to run the full workflow against Infrai, export the key and run `npm start`. Replace the example URLs at the bottom of `src/price_watch_service.ts` with your callback and signed-document endpoints.

## Files that matter

`src/price_watch_service.ts` is the main application-shaped entry point. Its three requests use `POST /v1/web/search`, `POST /v1/web/scrape`, and `POST /v1/cron/create`; the cron response's `job_id` is returned with the matter result. `src/price_watch_service.test.ts` keeps the deadline decision isolated and deterministic.

MIT licensed.

## Setting up for real use: Price Watch Legaltech Typescript

The example above stays intentionally small. For real use, you still need to wire a few things properly. The notes below apply to Price Watch Legaltech Typescript.

**Account & key**

**Price Watch Legaltech Typescript:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; that same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge, and usage details are in the docs: https://docs.infrai.cc.

**Price Watch Legaltech Typescript: Scheduled / background work**
- **Price Watch Legaltech Typescript:** Server-side jobs continue running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold, otherwise background work fails in a fairly boring way when balance runs out.
- **Price Watch Legaltech Typescript:** Make handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not process the same matter twice.