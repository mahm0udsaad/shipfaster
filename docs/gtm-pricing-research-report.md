# GTM & Pricing Research Report — ship-faster
*Synthesized 2026-07-10 from a deep-research run: 5 search angles, ~15 sources fetched, 91 claims extracted, 30 adversarial verification votes (28 survived, 2 refuted). Sources verified live include dartai.com/pricing, Bessemer's AI Pricing & Monetization Playbook (Feb 2026), and ChartMogul's SaaS Conversion Report (Jan 2026, n=200 B2B products).*

## 1. The single most important finding

**Your buyers are concentrated and already pay heavily for agent tooling.** Verified: developers using Claude Code daily commonly pay **$100–200/month for Claude Max**, and willingness to pay is sticky (users report paying even while unemployed). r/ClaudeCode has ~4,200 weekly contributors — 3× r/Codex (~1,200) and 5× r/Cursor (~800). The official Claude Discord has ~113k members with ~20k concurrently online. Claude Code held ~70% agent share on Vibe Kanban. **Conclusion: do not market to "freelancers" broadly. Market to Claude Code users who freelance.** A $19/mo tool is a rounding error next to their $200/mo Max subscription — the objection won't be price, it'll be "prove it saves me time."

## 2. Channel evidence (what actually works in 2024–2026, zero budget)

| Channel | Verified evidence | Verdict for you |
|---|---|---|
| **Reddit / niche communities** | Highest-converting zero-budget channel: **3–8% conversion** (20–150 signups per 500–3,000 visitors), ~3–5× Product Hunt | **Primary.** r/ClaudeCode is your exact ICP |
| **Show HN** | Largest raw free traffic: front page = **10,000–50,000 visits** at 1–3% conversion; only 20–30 Show HN posts/day vs ~200 PH launches/day; dev tools specifically perform better on HN | **Primary launch moment** |
| **Product Hunt** | Collapsed post-2024 algorithm change: featured rate fell from 60–98% to ~10%; documented case of #1 finish with 612 upvotes → **1 paying customer**; 0.5–2% conversion; 500+ daily submissions; pay-to-play services corrupt rankings | Do it for the badge/SEO, expect nothing |
| **Indie Hackers** | OpenHunts study of 387 launches: **~23% conversion per engaged IH post vs ~3% for a PH launch**; 15–20 min/day for 6 weeks → 1,200 visitors (case); but 54% of IH products make $0 | Secondary — post real numbers, engage genuinely |
| **Build-in-public on X** | Tony Dinh: $322→$2,164 MRR in 60 days, zero ad spend — **but** he started with ~14k followers and 7k pre-registered users. Does not transfer directly to a no-audience founder | Do it for compounding, not for launch |
| **MCP registries / Claude Code plugin directories** | Crowded (Glama ~37k servers, mcp.so 19k+, Smithery 7k+, MCP Market 10k+) but **publishing server.json to the official MCP Registry auto-propagates to downstream directories** (Smithery, Glama, PulseMCP crawl it). Individual free listings can reach huge installs (find-skills: 1.8M+), though ranking is gated by traction (installs, stars, votes). Directory "300k monthly visitors" claim was **refuted as unverified marketing** — treat as top-of-funnel only | **Free distribution — publish the MCP server publicly, claim your Glama listing, ship a Claude Code plugin** |
| **AppSumo lifetime deals** | AppSumo takes **~70% of revenue** (lemlist: $162k sales → ~$48k net for 3,000 lifetime customers); only ~25% of LTD tools alive after 3 years; but Stackby got 12k+ paying LTD customers and converted the base to recurring workspace subscriptions. Recommended LTD price if ever: 14–16× monthly | **Avoid in year one** — permanent-liability customers at 30% revenue while you're solo |
| **Expected launch yield** | A solo founder running a coordinated multi-platform launch (Reddit + X + HN + PH + directories, with 2–4 weeks of prior community participation) should expect **50–200 signups** | Set expectations accordingly |

## 3. Pricing evidence

**Comparables (verified live 2026-07-10):**
- **Dart** (closest competitor): Personal **free up to 4 users including AI agent features**, Premium **$8/user/mo**, Business $12/user/mo — per-seat, unlimited AI on all tiers, explicitly targets agencies/startups.
- **Linear**: ~$10–12/user/mo Basic, $16–20 Business; free tier capped at 250 issues. Positioned for 5–200-person teams — solo freelancers sit *below* its target market (your gap).
- **ClickUp**: $7–10 Unlimited, $12–17 Business, **AI sold as add-ons at $9 (Brain) and $28 (Everything AI) per user/mo** — evidence AI capability commands premium pricing on top of PM seats.

**Model evidence:**
- Bessemer (Feb 2026, verified): early-stage AI startups should use **hybrid pricing — base subscription + usage/outcome component**; AI-native companies are moving away from pure per-seat. Counterweight (also verified): buyers prefer predictable seat/flat pricing (Kustomer reverted from consumption to seats); pure outcome pricing fails for new products (~17% adoption, +20–30% sales-cycle length, 78% of successes were 5+ year-old products).
- ChartMogul (Jan 2026, n=200, verified): free **trial** beats freemium for conversion — per 1,000 visitors: freemium = 90 signups → 5 customers; no-card trial = 45 → 3.6; **card-required trial = 35 signups → 10.5 customers (30% conversion)**. Free trial is the primary model for 57% of B2B SaaS (freemium 26%). Median freemium free-to-paid: 8%.
- ConvertKit precedent: launching *above* incumbents ($29 vs MailChimp's $10) works when positioning is narrow ("email for creators" → "PM for agent-native freelancers"). Left-digit research: under $50, end prices in 9.

## 4. Pricing recommendation

**Flat per-workspace, not per-seat.** Your ICP is solo — per-seat yields $8–19 total and Dart underprices you anyway; agent-era seat compression (verified: 30–90% seat reductions cited) makes seats the wrong metric; and you must never meter agent actions (punishes the behavior the product exists to create — and Dart already gives unlimited AI).

| Tier | Price | What | Rationale |
|---|---|---|---|
| **Solo** | Free | Self-hosted/local, 3 projects, 2 agent tokens, community MCP server | Distribution into the Claude Code ecosystem; the registry listing IS the funnel |
| **Pro** | **$19/mo** (or $190/yr) | Hosted, unlimited projects & agents, Money view, Approvals, evals | Above Dart's $8 seat on purpose — ConvertKit logic: you're not "PM seats," you're "the context layer + client money brain." Trivial vs the $100–200/mo they pay Anthropic |
| **Agency** | **$49/mo/workspace** | Seats for humans, roles, client portal later | Undercuts 5 Linear Business seats (~$80–100) while doing what Linear won't (client money) |

**Entry mechanics:** free Solo tier for distribution + **14-day card-required trial on Pro** (the 30%-conversion model), with a founding-member discount (e.g., 33% off for life for the first 100 — Tony Dinh's converting mechanic) — *not* an AppSumo LTD.
**Later (per Bessemer hybrid):** keep flat base; if heavy hosted-agent usage emerges, add usage only for *hosted compute*, never for MCP calls.

## 5. The 90-day zero-budget plan

**Days 1–30 — Proof.** Dogfood across your 6 client projects; instrument the eval harness (pack-vs-no-pack rework numbers — this becomes the launch headline). Publish the MCP server to the **official MCP Registry** (server.json auto-propagates to Smithery/Glama/PulseMCP); claim the Glama listing. Landing page + waitlist ("Your coding agents, briefed."). Join r/ClaudeCode, Claude Discord, Claude Code Builders — help people genuinely, zero promotion, 20 min/day.

**Days 31–60 — Audience + design partners.** Build in public on X 3–5×/week using Veo/Flow for 30-second demo clips (real Claude Code session pulling a context pack — inherently shareable); mirror the best posts to Indie Hackers with real numbers (verified: number-driven posts convert ~23% per engaged post). Recruit **10 design partners** via ~20 personalized DMs/day to people complaining about agent context loss in r/ClaudeCode/r/cursor (the Tony Dinh mechanic that doesn't need an audience). Free for 6 weeks in exchange for weekly feedback.

**Days 61–90 — Launch.** Ship the Claude Code plugin/skill to the directories. **Show HN first** (dev tools outperform there; headline = your eval numbers, e.g. "Show HN: I gave my coding agents a project brain — 60% less rework across 6 client projects"). Product Hunt 2–4 days later with a different angle (badge play). Convert design partners + waitlist with the founding-member offer. Realistic target per the verified benchmark: **50–200 signups, 5–15 paying** — that's a successful start, not a failure.

**Kill/adjust gates:** <4/10 design partners actively using it weekly → the pain is imagined, revisit; card-trial conversion >30% → raise the price.

## Refuted / caveated claims (for honesty)
- The Claude-tools directory's "300,000 monthly visitors" is self-reported advertiser marketing — 2 of 3 verifiers refuted the inference; treat directory listings as top-of-funnel only.
- Tony Dinh's build-in-public numbers depended on a pre-existing 14k-follower audience — the *mechanics* (daily posts, 20 DMs/day, early-bird discount) transfer; the *timeline* doesn't.
