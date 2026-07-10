# Mega Prompt — ship-faster: Landing Page + Full Web App Design

> Paste this to the AI designer. It assumes you already have the project context and a built
> design system — use them. This brief tells you WHAT to design and WHY it must feel a
> certain way; your design system tells you HOW to render it.

---

## 0. Your role

You are the product designer for **ship-faster**. Design (1) a marketing **landing page** that
converts developers who already use AI coding agents, and (2) the **entire web app** — every
screen, state, and the design language that ties them together. Work at high fidelity: real
copy, real data, real empty/loading/error states. No lorem ipsum, no placeholder rectangles.

Apply the existing design system for all tokens, type scale, spacing, and components. Extend it
only where this product needs something new (see §4 — the agent-native patterns). When you add a
component, add it to the system, don't one-off it.

---

## 1. Product in one screen

ship-faster is **the context layer for your coding agents** — an agent-native project-management
tool for solo freelancers and small dev agencies who run client work with AI agents (Claude
Code, Cursor, Codex).

The loop it enables:
1. **Context Pack** — an agent starts a task and is automatically briefed with the project's
   memory, the task, and recent history (instead of the human re-explaining every session).
2. **Session Log** — the agent files a structured work report when done.
3. **Project Brain** — that work compounds into durable per-project memory.
4. **Approvals** — every agent action that touches clients, money, or memory waits for one human
   click. Agents move fast inside their lane; the human stays in control of the edges.

Plus what generic PM tools lack for this user: **money-awareness** — milestones with amounts,
"what's owed across clients," mixed fixed-price + retainer work.

One-liner for the product: **"Your coding agents, briefed."**

---

## 2. Who you're designing for, and the feeling to evoke

**Audience:** technical, impatient, taste-literate. They live in Linear, GitHub, and a terminal.
They pay $100–200/mo for Claude Max without blinking. They distrust bloat, marketing fluff, and
anything that feels like enterprise Jira.

**The feeling:** *calm control at speed.* Not a busy dashboard — a cockpit. Dense where they want
density (boards, activity), spacious where they want to think (the Brain, an approval). It should
feel closer to Linear/Vercel than to Asana/monday. Confident, fast, quietly powerful. Never cute.

**The trust bar:** because AI agents write to this product, the UI must make every agent action
legible and reversible-feeling. If a user ever can't tell who did what, we've failed.

---

## 3. Rules of engagement with the design system

- Use existing tokens (color, type, spacing, radius, shadow, motion) everywhere. Don't invent
  values. If light and dark are both defined, design **both** for every screen — this audience
  skews dark-mode.
- Reuse existing components (buttons, inputs, tables, cards, badges, menus, dialogs, toasts,
  tabs, avatars, tooltips). Compose, don't reinvent.
- Keep the interface quiet: one primary action per view, restrained color, color used to mean
  something (status, agent-vs-human) rather than to decorate.
- Accessibility is non-negotiable: WCAG AA contrast, visible focus states, keyboard paths for
  every action, 44px min touch targets, reduced-motion variants.

---

## 4. THE defining design challenge: an agent-native UI

This is the part no competitor has solved and where this product's design must be original.
**Humans and AI agents act on the same objects.** Design a consistent visual language for it:

- **Actor identity everywhere.** Every task card, comment, activity row, and brain edit shows who
  acted — a human (you) or a named agent (e.g. `@project-lead`, `@worker/bookitfly`). Design a
  distinct-but-calm treatment for agent actors (e.g. a subtle badge/avatar variant, a monospace
  handle, a faint accent) so a glance separates human from machine. Do not make agents look like
  errors or warnings — they're teammates, not alerts.
- **Staged vs. applied.** Agent proposals (brain diffs, drafted client messages, plan changes)
  are *not yet real*. Design a clear "proposed / pending your approval" state distinct from
  committed state. The Approvals inbox is where these live.
- **Autonomy legibility.** Show, subtly, when an agent is working, blocked, or waiting on the
  human. A task assigned to an agent should read differently from one assigned to the human.
- **Auditability.** One click from any agent-caused change should reveal its origin (which
  session, what reasoning). Design this as a lightweight "provenance" popover, not a heavy modal.
- **Reversibility feel.** Anything an agent did should feel one gesture from undo/override. Even
  where it isn't literally undoable, the UI should never feel like the agent got the last word.

Deliver this as a small set of reusable patterns (ActorTag, ProposedBadge, ProvenancePopover,
AgentStatusDot) that every screen then uses.

---

## 5. LANDING PAGE — full spec

Goal: a developer from r/ClaudeCode or Hacker News lands, *gets it in 5 seconds*, and either joins
the waitlist or starts free. Single scrolling page, fast, no carousels, no stock photos. The hero
must show the product, not describe it.

Design these sections in order:

1. **Nav (minimal):** wordmark, anchor links (How it works · Pricing · Docs), `Sign in`, and a
   primary `Start free` button. Sticky, condenses on scroll.

2. **Hero.**
   - Headline: **"Your coding agents, briefed."**
   - Sub: *"ship-faster gives Claude Code and Cursor the full context of every client project —
     then files their work back as it happens. Stop re-explaining. Start shipping."*
   - Primary CTA `Start free`, secondary `See how it works`.
   - **Hero visual (do the real work here):** a stylized product shot showing an agent pulling a
     Context Pack — the pack's manifest ("included: brain, task, recent activity") beside a task
     moving to `review` with a `@worker` tag. Make the agent-native idea visible instantly.
   - A thin trust line: "Works with the tools you already pay for" + small Claude Code / Cursor /
     Codex marks (respect their brand usage).

3. **The problem (empathy, 3 beats).** Short, punchy, developer-true:
   *"Every agent session starts from zero." · "Decisions get lost in WhatsApp and your head." ·
   "You can't tell what your agents actually did."* Pair each with a small illustrative motif.

4. **How it works (the loop).** A 4-step horizontal/vertical flow: **Brief → Work → Report →
   Remember**, mapping to Context Pack → agent works in the repo → Session Log → Project Brain.
   Each step: one line of copy + a tiny concrete UI fragment. This is the core narrative — make
   it the most polished section.

5. **Feature blocks (alternating, 4–5).** Each = a real UI crop + a tight benefit headline:
   - **Context Packs** — "Agents that already know the project."
   - **Project Brain** — "Memory that compounds instead of evaporating."
   - **Approvals inbox** — "Autonomy you actually control."
   - **Money view** — "See what every client owes, in one place."
   - **Session Logs** — "Every agent session, on the record."

6. **Proof / differentiation.** A compact comparison ("Not another Jira / Linear for agents") —
   a small table or statement contrasting ship-faster (briefed agents, shared memory, approvals,
   client money) vs. generic PM tools (issues only). Leave a slot for a headline metric later
   (e.g. *"— % less agent rework"*) — design the placeholder so a number drops in cleanly.

7. **Pricing.** Three tiers, clean cards, monthly/annual toggle:
   - **Solo — Free:** self-host, 3 projects, 2 agent tokens.
   - **Pro — $19/mo:** hosted, unlimited projects & agents, Money, Approvals, evals. *(Mark
     "Most popular.")*
   - **Agency — $49/mo:** seats, roles, client portal (soon).
   Emphasize Pro. No per-agent-action metering (that's a selling point — say pricing is flat).

8. **FAQ.** 5–6: "Does it run my agents?" (no — it briefs the ones you have) · "Which agents?" ·
   "Is my client data safe?" · "Self-hosting?" · "Do agents message my clients?" (never — they
   draft, you send).

9. **Final CTA band + footer.** Repeat "Your coding agents, briefed." + `Start free`. Footer:
   product, docs, GitHub, MCP registry link, legal, socials.

Landing tone: confident, concrete, zero hype words ("revolutionary", "AI-powered"). Every claim
maps to a real feature.

---

## 6. WEB APP — screen-by-screen

Design the full authenticated app. For **each** screen deliver: the populated (happy) state, the
**empty** state, a **loading** skeleton, and any key **error**/permission state. Design mobile
(≥375px) and desktop for all; the app is desktop-first but must be usable on a phone for triage.

### 6.1 Global shell
- Left nav (collapsible): Today · Approvals (with badge count) · Projects · Clients · Money ·
  Agents. Footer of nav: account menu, theme toggle, help.
- Top bar: breadcrumb/context title, global **search** (⌘K command palette — searches tasks,
  brain, activity), and a `+ New` action.
- The Approvals badge is the app's heartbeat — design its count/pulse so a pending agent
  proposal is always visible but never nagging.

### 6.2 Today (home)
Purpose: "what needs me, across everything." Cross-project. Sections:
- **Needs you** — top of the approvals inbox (2–3 items inline).
- **Due & overdue** tasks across projects.
- **Blocked** tasks (many will be agent-blocked — show the blocker).
- **Stale** flags (projects/tasks with no recent activity).
Design it as a calm triage feed, not a metrics dashboard. Empty state = "You're clear. Agents are
working — check back or open a project."

### 6.3 Approvals inbox  ★ the human-in-the-loop surface
Purpose: review and resolve everything agents propose. This screen must feel **safe and fast**.
- A list/queue of approval cards, each typed: **brain diff**, **drafted client message**, **task
  plan change**, **scope question**. Each card shows: which agent, which project, a preview of the
  change, and `Approve` / `Reject` (+ optional note).
- **Brain diff card:** render a real before/after diff of a Brain section, with the evidence
  (the session that proposed it) one click away.
- **Client message draft card:** show the drafted message in a realistic bubble/email preview
  with an explicit "You send this — we never message clients" reassurance and a `Copy` / `Open in
  WhatsApp/email` action (the human sends, not the agent).
- Bulk actions; keyboard-first (j/k to move, a/r to resolve). Empty state = "Inbox zero. Nothing
  waiting on you."

### 6.4 Projects (list)
Grid or table of projects: name, client, status, open-task count, next milestone, an at-a-glance
health dot (active/stale/blocked), and agent activity indicator. `+ New project`. Empty state
onboards the first project.

### 6.5 Project detail — tabbed: Board · Brain · Activity · Milestones
Shared project header: name, client, status, money summary chip (owed/paid), assigned agents
(avatars), quick actions.

- **Board.** Columns by status: Todo · In progress · Blocked · Review · Done. Task cards show:
  title, priority, assignee (**human vs agent** via ActorTag), due, subtask count, and a
  `proposed` marker if an agent suggested changes. Critical detail: a card in **Review** was set
  there by an agent and is **waiting for the human to close it** (only humans mark Done) — design
  that hand-off moment clearly. Drag-drop; agent-assigned cards get the AgentStatusDot (working/
  blocked/waiting). Task detail (drawer or page): description, **acceptance criteria** (highlight
  — a task can't be agent-assigned without it), comment thread with actor tags, subtasks,
  activity, and the **Context Pack preview** ("what an agent sees for this task").

- **Brain.** The project memory as fixed sections: Current state · Decisions · Conventions ·
  Environment · Client notes · Open questions. Human-editable inline (versioned). Show **version
  history** and, for any agent-proposed edit, the diff + evidence. This screen should feel like a
  living document, not a form — readable, calm, authoritative. Empty section = a helpful prompt to
  seed it.

- **Activity.** Unified, append-only audit feed of everything humans and agents did, plus
  **Session Logs** rendered richly (summary, files/PRs changed, tests status, blockers, next
  step). Filter by actor (human/agent), by type. Every row carries provenance. This is where
  trust is won — make agent work feel transparent and reviewable.

- **Milestones.** List with amount, currency, status (pending/invoiced/paid), due/paid dates,
  linked tasks. Inline status changes. A small money roll-up for the project.

### 6.6 Clients
Client list + detail: contact info, comms channel (WhatsApp/email/calls), the client's projects,
and a money summary per client. Design for a freelancer juggling relationships, not a CRM.

### 6.7 Money  ★ the freelancer-specific view
Cross-client financial view: **what's owed** (unpaid/invoiced milestones), paid, aging, retainer
status. A clear "you are owed $X across N clients" headline number. Sortable by client, amount,
age. Make this genuinely useful at a glance — it's a reason freelancers choose this over Linear.

### 6.8 Agents
Manage agent identities: name, role (Project Lead / Worker / Intake), project scope, token status,
last active, and a **one-click revoke**. A "connect an agent" flow that generates a token and
shows the exact MCP config to paste into Claude Code/Cursor. Per-agent activity link. This screen
makes the abstract ("agents") concrete and controllable.

### 6.9 Onboarding / connect-an-agent
First-run: create workspace → add first project (or import) → **connect your first agent**
(generate token + copy the MCP snippet) → optional "Paste → Tasks" to seed work. Design a
confident, short path to the first "my agent is briefed" aha moment.

### 6.10 Paste → Tasks (intake)
A focused screen/modal: paste a WhatsApp/email thread → the parser proposes tasks, detected
commitments (who/what/when), and ambiguities — each traceable to a **quoted source line**. Human
reviews, edits, and confirms before anything is created. Nothing is written until confirmed —
design that safety clearly.

### 6.11 Auth & settings
Sign in/up (email + provider), workspace settings, billing (the three tiers + manage
subscription), profile, theme. Keep minimal.

---

## 7. Cross-cutting requirements

- **States:** every screen needs happy / empty / loading (skeleton) / error / permission-denied.
  Empty states should teach and invite the next action, never dead-end.
- **Agent legibility (from §4):** apply ActorTag, ProposedBadge, ProvenancePopover, AgentStatusDot
  consistently across Board, Activity, Brain, Approvals, Today.
- **Responsive:** desktop-first cockpit; phone must support triage (Today, Approvals, a task).
  Tables scroll inside their own container — the page never scrolls horizontally.
- **Dark + light:** both, for every screen.
- **Motion:** purposeful and fast (state changes, drag, approve/reject, toasts). Respect
  reduced-motion. Nothing bouncy or slow.
- **Density control:** consider a comfortable/compact toggle for power users on boards and tables.
- **Command palette (⌘K):** first-class navigation and quick actions.
- **Accessibility:** AA contrast, focus rings, full keyboard operation (especially Approvals and
  Board), semantic structure, alt text.

---

## 8. Deliverables & priority order

Design in this order (highest leverage first):
1. **Landing page** (hero + how-it-works are the make-or-break).
2. **The agent-native pattern set** (§4) — define these before the app screens use them.
3. **Approvals inbox** and **Board + task detail** — the core daily surfaces.
4. **Brain** and **Activity/Session Logs** — the trust surfaces.
5. **Today**, **Money**, **Agents**, **Clients**.
6. **Onboarding**, **Paste → Tasks**, **auth/settings**.

For each: desktop + mobile, light + dark, all states, and a short note on any new component added
to the system. Provide a redlined/spec version for the 3–4 most complex screens (Approvals, Board,
Brain, Money) so engineering can build without guessing.

---

## 9. Guardrails — what NOT to do

- Don't make it look like Jira/Asana/monday (enterprise, busy, colorful). Aim Linear/Vercel-clean.
- Don't make agents look like alerts, bots-with-googly-eyes, or errors. They are calm teammates.
- Don't hide who did what — attribution is a feature, not clutter.
- Don't invent design tokens; extend the existing system.
- Don't design autonomous-client-messaging UI — agents draft, the human always sends.
- Don't add features not in this brief (no time tracking, invoicing, chat between agents, vector
  search UI) — they're deliberately out of scope for v1.
- Don't use stock photography or generic 3D blobs. If you illustrate, illustrate the product.

Design like the user's trust is the product. Because it is.
