import type { VercelRequest, VercelResponse } from "@vercel/node";

// Vercel Node.js functions use Express-style (req, res) — NOT Web API (Request) => Response.
// Web API style only works in Edge Runtime or Next.js.
export default function handler(req: VercelRequest, res: VercelResponse) {
  // res.json() sends JSON with the correct Content-Type header and HTTP 200 by default.
  // toISOString() confirms the server is live (not serving a stale cached response).
  res.json({ status: "ok", timestamp: new Date().toISOString() });
}
