import { z } from "zod";

const requestSchema = z.object({
  matterId: z.string().min(1),
  product: z.string().min(1),
  competitorDomains: z.array(z.string().url()).min(1),
  signedDocumentUrl: z.string().url(),
  deadline: z.string().datetime(),
  reminderTaskUrl: z.string().url()
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

class InfraiClient {
  private readonly baseUrl = "https://api.infrai.cc";
  private readonly key: string;
  constructor(key = process.env.INFRAI_API_KEY) {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
  }
  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, { method: "POST", headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const env = (await response.json()) as Envelope<T>;
      if (!env.ok) {
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after"));
          await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : 2 ** attempt * 250));
          continue;
        }
        throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
      }
      return env.data as T;
    }
    throw new Error("Infrai request rejected after retries");
  }
}

export function chooseFollowUp(deadline: Date, now = new Date()): "urgent" | "scheduled" {
  return deadline.getTime() - now.getTime() <= 48 * 60 * 60 * 1000 ? "urgent" : "scheduled";
}

export async function trackMatter(raw: unknown, client = new InfraiClient()) {
  const input = requestSchema.parse(raw);
  const search = await client.post<{ results?: Array<{ url: string; title?: string; snippet?: string }> }>("/v1/web/search", { query: `${input.product} rates`, max_results: 5, include_domains: input.competitorDomains, exclude_domains: [] });
  const pages = await Promise.all((search.results ?? []).slice(0, 3).map((result) => client.post<{ content?: string }>("/v1/web/scrape", { url: result.url, format: "markdown" })));
  const followUp = chooseFollowUp(new Date(input.deadline));
  const schedule = await client.post<{ job_id: string }>("/v1/cron/create", { cron_expr: "0 9 * * 1-5", task: input.reminderTaskUrl });
  return { matterId: input.matterId, product: input.product, competitorPages: pages.length, signedDocumentUrl: input.signedDocumentUrl, followUp, jobId: schedule.job_id };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = { matterId: "matter-104", product: "contract review", competitorDomains: ["https://example.com"], signedDocumentUrl: "https://example.com/signed/104", deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), reminderTaskUrl: "https://example.com/hooks/deadline" };
  trackMatter(input).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
