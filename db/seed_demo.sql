-- Demo data for the dashboard: one fictional company, "Tallyroom (demo)",
-- with work in every state the dashboard renders — a bounce, a draft waiting
-- on the founder, a blocked request, a contradiction, work in flight.
--
-- Opt-in, and destructive: it REPLACES company_brain and clears every
-- work order, draft, brief, amendment and receipt. Never run it against a
-- real company's database.
--
--   docker exec -i founder-agents-postgres psql -U founder_agents -d founder_agents < db/seed_demo.sql
--
-- Figures are internally consistent: 23 accounts x $19 = $437 MRR; gross
-- burn $7,400; net burn $7,400 - $437 = $6,963; runway $84,000 / $6,963 =
-- 12.1 months.

begin;

truncate agent_run_logs, drafts, work_orders, briefs, playbook_amendments restart identity cascade;

update company_brain set updated_at = now() - interval '2 days', data = '{
  "company": {
    "name": "Tallyroom (demo)",
    "one_liner": "Matches Stripe payouts to bank deposits so a solo SaaS founder can close the month in minutes.",
    "stage": "revenue"
  },
  "product": {
    "what_it_does": "Imports Stripe payouts and bank CSV exports, matches each payout to its deposit, and lists every unmatched amount with the reason it failed to match.",
    "current_state": "Software. Web app in private beta with 23 paying accounts. Stripe plus bank CSV import; no direct bank connections.",
    "live_url": null
  },
  "icp": {
    "who": "Solo SaaS founders on Stripe doing their own bookkeeping, $2k to $30k MRR.",
    "evidence": "19 of 23 paying accounts are single-founder SaaS on Stripe (customers.csv). 11 of 14 discovery calls named month-end reconciliation as the chore they put off longest (calls.md)."
  },
  "positioning": {
    "differentiation": "Self-hosted build: financial data never leaves the founder''s machine.",
    "messaging": "Close the month without opening a spreadsheet."
  },
  "constraints": {
    "runway_months": 12.1,
    "monthly_burn": 6963,
    "founder_hours_per_week": 30
  },
  "decisions": [
    {
      "decision": "Price the solo plan at $19/month.",
      "reasoning": "9 of 14 discovery calls named $15 to $20 as what they pay for comparable bookkeeping add-ons (calls.md).",
      "date": "2026-08-04",
      "revisit_if": "Gross margin per account falls below 70%."
    },
    {
      "decision": "No direct bank connections before 50 paying accounts.",
      "reasoning": "Aggregator fees and the compliance review cost more founder-hours than CSV import saves at current volume.",
      "date": "2026-07-18",
      "revisit_if": "More than a third of churned accounts cite CSV import as the reason they left."
    }
  ],
  "priorities": [
    "Reach 40 paying accounts",
    "Cut time to first match below 10 minutes",
    "Keep net burn under $7,000/month"
  ]
}'::jsonb
where id = 1;

-- Briefs -------------------------------------------------------------------

insert into briefs (id, body, status, response, created_at, answered_at) values
(1, 'Where does runway stand, and is $19 still the right solo price?', 'answered',
 'Issued two work orders: Finance runs the runway tracker (wo_1), Growth checks positioning against evidence (wo_2). Both filed. Finance and Growth disagree on pricing — shown on the desk for your decision.',
 now() - interval '2 days', now() - interval '2 days' + interval '6 minutes'),
(2, 'Draft outreach to Maya Okafor about CSV import, and get direction for the onboarding checklist screen.', 'answered',
 'Issued three work orders: Growth drafts the outreach (wo_3), Design gives direction for the onboarding checklist (wo_5), then Technical scopes it (wo_6, waits on wo_5).',
 now() - interval '5 hours', now() - interval '5 hours' + interval '2 minutes'),
(3, 'Pay the Postmark annual invoice before the discount ends Friday.', 'answered',
 'Issued one work order to Finance (wo_4). Paying an invoice moves money, so it is blocked: Finance recommends, you pay it yourself.',
 now() - interval '50 minutes', now() - interval '48 minutes');
select setval('briefs_id_seq', 3);

-- Work orders --------------------------------------------------------------

insert into work_orders (id, team, skill, summary, brief_id, inputs, acceptance_criteria, tier, depends_on, status, created_at, updated_at) values
('wo_1', 'finance', 'runway_tracker', 'Burn and runway from actual expense and revenue rows', 1,
 '{"datasets": ["expenses.csv", "revenue.csv"], "cash_on_hand": {"amount": 84000, "as_of": "2026-09-01"}}',
 '["Gross burn, net burn and runway each show formula and inputs", "Three scenarios, each labelled a projection", "Structural flags listed"]',
 'auto', '[]', 'done', now() - interval '2 days', now() - interval '2 days' + interval '5 minutes'),
('wo_2', 'growth', 'positioning_check', 'Test the stated positioning against customer evidence', 1,
 '{"datasets": ["customers.csv", "calls.md"]}',
 '["Every claim classified evidenced, assumed or contradicted", "Every evidenced claim cites a row or quote", "Cheapest test for the weakest claim"]',
 'auto', '[]', 'done', now() - interval '2 days', now() - interval '2 days' + interval '4 minutes'),
('wo_3', 'growth', 'outreach_draft', 'Outreach to Maya Okafor (Pitchlog) about CSV import', 2,
 '{"recipient_record": "contacts.csv:14"}',
 '["Recipient exists in contacts.csv", "Opens on one dated, sourced signal", "Under 90 words", "One low-cost ask"]',
 'approve', '[]', 'in_progress', now() - interval '5 hours', now() - interval '4 hours'),
('wo_4', 'finance', 'runway_tracker', 'Postmark annual invoice: pay annually or monthly', 3,
 '{"line_item": "expenses.csv:9"}',
 '["Compares annual and monthly cost with arithmetic", "States that paying is blocked and who does it"]',
 'blocked', '[]', 'done', now() - interval '50 minutes', now() - interval '47 minutes'),
('wo_5', 'design', 'product_design_direction', 'Direction for the onboarding checklist screen', 2,
 '{"artifact": "Onboarding checklist screen (first session, before first match)"}',
 '["Names the screen", "States the one-sentence brief", "Every choice carries its reason"]',
 'auto', '[]', 'in_progress', now() - interval '5 hours', now() - interval '20 minutes'),
('wo_6', 'technical', 'scope_mvp', 'Scope the onboarding checklist in founder-hours', 2,
 '{"feature": "Onboarding checklist screen"}',
 '["Three scopes in founder-hours with assumptions", "Checked against 30 founder-hours per week", "Names what each scope leaves untested"]',
 'auto', '["wo_5"]', 'pending', now() - interval '5 hours', now() - interval '5 hours');

-- Drafts -------------------------------------------------------------------

insert into drafts (work_order_id, team, skill, summary, content, tier, verdict, failed_checks, required_fixes, retry_count, contradiction, created_at) values
('wo_1', 'finance', 'runway_tracker', 'Runway is 12.1 months at current burn (projection)',
 $json${
  "body": "| Figure | Formula | Value |\n|---|---|---|\n| Gross burn | sum of August outflows (expenses.csv rows 2–31) | $7,400/mo |\n| Revenue | 23 accounts × $19 (revenue.csv) | $437/mo |\n| Net burn | $7,400 − $437 | $6,963/mo |\n| Cash on hand | founder's stated balance, 1 Sep 2026 | $84,000 |\n| Runway | $84,000 ÷ $6,963 | 12.1 months |\n\n**Five largest line items** (share of $7,400 gross burn): founder draw $4,500 (60.8%), contract designer $1,200 (16.2%), hosting $610 (8.2%), tools and subscriptions $543 (7.3%), legal and accounting retainer $400 (5.4%).\n\n**Projections — three scenarios**\n\n| Scenario | Assumption | Runway (projection) |\n|---|---|---|\n| Current | Net burn holds at $6,963 | $84,000 ÷ $6,963 = 12.1 months |\n| Downside | Revenue flat; burn grows 4%/mo, its trailing 3-month rate | n where $6,963 × (1.04ⁿ − 1) ÷ 0.04 = $84,000 → 10.0 months |\n| Action | End the contract designer engagement (expenses.csv row 4) | $84,000 ÷ ($6,963 − $1,200) = 14.6 months |\n\n**Flags**\n\n- Gross margin per account at $19 is ($19 − $6.40) ÷ $19 = 66.3%. The pricing decision's revisit condition is margin below 70%.\n- Burn grew 4% a month for three months (June–August) while revenue grew 2.1%.",
  "citations": [
    {"claim": "Variable cost per account $6.40", "source": "expenses.csv rows 12–31: hosting $2.10 + Postmark $0.60 + Stripe fees $0.85 + CSV parsing service $2.85"},
    {"claim": "Cash on hand $84,000", "source": "inputs.cash_on_hand, stated 2026-09-01"}
  ],
  "limitations": "Expense data covers seven months (February to August 2026). Cash on hand is the founder's stated balance, not a bank feed."
 }$json$::jsonb,
 'auto', 'pass', '[]', '[]', 0,
 '{
  "with": "growth",
  "about": "pricing",
  "their_position": "Keep the solo plan at $19/month. 9 of 14 discovery calls anchor on $15 to $20, and the recorded pricing decision sets $19.",
  "their_depends_on": "Discovery-call price anchors (calls.md) holding for accounts that actually pay.",
  "our_position": "At $19, gross margin per account is 66.3% — below the 70% floor the pricing decision named as its revisit condition.",
  "our_depends_on": "Variable cost per account of $6.40, from expenses.csv rows 12–31.",
  "why_it_matters": "Every new account at $19 widens net burn by less than it looks. The price communicated in outreach this week sets expectations for the next 17 accounts."
 }'::jsonb,
 now() - interval '2 days' + interval '4 minutes'),

('wo_2', 'growth', 'positioning_check', 'Self-hosting is contradicted as the reason accounts pay',
 $json${
  "body": "| Claim | Support | Evidence |\n|---|---|---|\n| Self-hosted build: financial data never leaves the founder's machine | contradicted | 2 of 23 paying accounts run the self-hosted build (customers.csv, column deployment) |\n| Close the month without opening a spreadsheet | assumed | No customer has said this in their own words yet |\n| $19/month is the price solo founders anchor on | evidenced | 9 of 14 discovery calls named $15–$20 (calls.md, calls 2, 3, 5, 6, 8, 9, 11, 12, 14) |\n| ICP is solo SaaS founders on Stripe | evidenced | 19 of 23 paying accounts (customers.csv) |\n\n**Weakest claim:** the differentiation. Accounts pay for matching, not for self-hosting.\n\n**Cheapest test:** one question in the next billing email to the 21 hosted accounts — which one thing would you miss most if Tallyroom disappeared.",
  "citations": [
    {"claim": "2 of 23 self-hosted", "source": "customers.csv, deployment column"},
    {"claim": "9 of 14 anchor on $15–$20", "source": "calls.md"}
  ],
  "limitations": "23 paying accounts is enough to report a contradiction, not enough to rank what they value instead."
 }$json$::jsonb,
 'auto', 'pass', '[]', '[]', 0, null,
 now() - interval '2 days' + interval '3 minutes'),

('wo_3', 'growth', 'outreach_draft', 'Outreach to Maya Okafor, first attempt',
 $json${
  "recipient": "Maya Okafor, founder of Pitchlog — contacts.csv row 14",
  "signal": {"what": "Public post about reconciling Stripe payouts by hand over a weekend", "date": "2026-09-19", "source": "Link recorded in contacts.csv row 14"},
  "body": "Maya — saw your post about reconciling Stripe by hand. Tallyroom is the fastest way to close the month: founders save six hours a month on average. Want a demo this week?"
 }$json$::jsonb,
 'approve', 'fail', '["U1", "G3"]',
 '["Cite a source for \"founders save six hours a month\" or remove it.", "Remove \"the fastest\" — an unsubstantiated superlative."]',
 0, null,
 now() - interval '4 hours 40 minutes'),

('wo_3', 'growth', 'outreach_draft', 'Outreach to Maya Okafor, opens on her 19 September post',
 $json${
  "recipient": "Maya Okafor, founder of Pitchlog — contacts.csv row 14",
  "signal": {"what": "Public post about reconciling Stripe payouts by hand over a weekend", "date": "2026-09-19", "source": "Link recorded in contacts.csv row 14"},
  "body": "Maya — your post on 19 September about losing a weekend to matching Stripe payouts by hand stuck with me. It is the chore most solo founders I talk to put off longest.\n\nTallyroom imports your Stripe payouts and bank CSV, matches each payout to its deposit, and lists anything unmatched with the reason.\n\nWould it help if I ran last month's export through it and sent you the unmatched list?",
  "word_count": 67
 }$json$::jsonb,
 'approve', 'pass', '[]', '[]', 1, null,
 now() - interval '4 hours'),

('wo_4', 'finance', 'runway_tracker', 'Pay Postmark annually: saves $60 a year',
 $json${
  "body": "**Recommendation:** pay annually.\n\n| Option | Formula | Cost per year |\n|---|---|---|\n| Monthly | $50 × 12 (expenses.csv row 9) | $600 |\n| Annual | quoted annual price (invoice attached to expenses.csv row 9) | $540 |\n| Difference | $600 − $540 | $60 saved |\n\nPaying the invoice moves money. Finance cannot do it. Pay it from Postmark's billing page before Friday if you agree.",
  "blocked_action": "Pay the Postmark annual invoice ($540)",
  "rule": "business_rules — Blocked actions: moving money. Payments, transfers, refunds, invoicing that triggers a charge."
 }$json$::jsonb,
 'blocked', 'pass', '[]', '[]', 0, null,
 now() - interval '48 minutes');

-- Receipts -----------------------------------------------------------------

insert into agent_run_logs (agent, skill, work_order_id, step, inputs, output, verdict, created_at) values
('orchestrator', 'planning', null, 'Classified brief 1 as execute', '{"brief_id": 1}', '{"class": "execute"}', null, now() - interval '2 days'),
('orchestrator', 'planning', 'wo_1', 'Issued wo_1 to Finance', '{"brief_id": 1}', '{"tier": "auto"}', null, now() - interval '2 days' + interval '20 seconds'),
('orchestrator', 'planning', 'wo_2', 'Issued wo_2 to Growth', '{"brief_id": 1}', '{"tier": "auto"}', null, now() - interval '2 days' + interval '25 seconds'),
('finance', 'runway_tracker', 'wo_1', 'Loaded 31 expense rows and 7 revenue rows, Feb–Aug 2026', '{"datasets": ["expenses.csv", "revenue.csv"]}', '{"rows": 38}', null, now() - interval '2 days' + interval '1 minute'),
('finance', 'runway_tracker', 'wo_1', 'Computed burn and runway', '{}', '{"net_burn": 6963, "runway_months": 12.1}', null, now() - interval '2 days' + interval '2 minutes'),
('finance', 'runway_tracker', 'wo_1', 'Attached contradiction with Growth on pricing', '{}', '{"with": "growth"}', null, now() - interval '2 days' + interval '3 minutes'),
('growth', 'positioning_check', 'wo_2', 'Classified 4 claims', '{"datasets": ["customers.csv", "calls.md"]}', '{"contradicted": 1, "assumed": 1, "evidenced": 2}', null, now() - interval '2 days' + interval '3 minutes'),
('reviewer', 'review_rubric', 'wo_2', 'Checked draft against U1–U6, G1–G5', '{}', '{"failed_checks": []}', 'pass', now() - interval '2 days' + interval '4 minutes'),
('reviewer', 'review_rubric', 'wo_1', 'Checked draft against U1–U6, F1–F4', '{}', '{"failed_checks": []}', 'pass', now() - interval '2 days' + interval '5 minutes'),
('orchestrator', 'planning', null, 'Classified brief 2 as execute', '{"brief_id": 2}', '{"class": "execute"}', null, now() - interval '5 hours'),
('orchestrator', 'planning', 'wo_3', 'Issued wo_3 to Growth', '{"brief_id": 2}', '{"tier": "approve"}', null, now() - interval '5 hours' + interval '30 seconds'),
('orchestrator', 'planning', 'wo_5', 'Issued wo_5 to Design', '{"brief_id": 2}', '{"tier": "auto"}', null, now() - interval '5 hours' + interval '35 seconds'),
('orchestrator', 'planning', 'wo_6', 'Issued wo_6 to Technical, waits on wo_5', '{"brief_id": 2}', '{"tier": "auto", "depends_on": ["wo_5"]}', null, now() - interval '5 hours' + interval '40 seconds'),
('growth', 'outreach_draft', 'wo_3', 'Found recipient at contacts.csv row 14', '{}', '{"recipient_record": "contacts.csv:14"}', null, now() - interval '4 hours 50 minutes'),
('growth', 'outreach_draft', 'wo_3', 'Returned draft, attempt 1', '{}', '{"word_count": 31}', null, now() - interval '4 hours 40 minutes'),
('reviewer', 'review_rubric', 'wo_3', 'Bounced draft: U1 uncited number, G3 superlative', '{}', '{"failed_checks": ["U1", "G3"]}', 'fail', now() - interval '4 hours 39 minutes'),
('growth', 'outreach_draft', 'wo_3', 'Returned draft, attempt 2', '{}', '{"word_count": 67}', null, now() - interval '4 hours 2 minutes'),
('reviewer', 'review_rubric', 'wo_3', 'Checked draft against U1–U6, G1–G5', '{}', '{"failed_checks": []}', 'pass', now() - interval '4 hours'),
('design', 'product_design_direction', 'wo_5', 'Read product.current_state: software', '{}', '{"discipline": "software"}', null, now() - interval '20 minutes'),
('orchestrator', 'planning', null, 'Classified brief 3 as execute', '{"brief_id": 3}', '{"class": "execute"}', null, now() - interval '50 minutes'),
('orchestrator', 'planning', 'wo_4', 'Issued wo_4 to Finance as blocked: moves money', '{"brief_id": 3}', '{"tier": "blocked"}', null, now() - interval '49 minutes'),
('finance', 'runway_tracker', 'wo_4', 'Compared annual and monthly cost', '{"line_item": "expenses.csv:9"}', '{"saving": 60}', null, now() - interval '48 minutes'),
('reviewer', 'review_rubric', 'wo_4', 'Checked draft: U4 blocked action drafted, not executed', '{}', '{"failed_checks": []}', 'pass', now() - interval '47 minutes');

commit;
