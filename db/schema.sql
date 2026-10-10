-- Phase 0 harness state. See AGENTS.md for the shape these tables encode
-- and ROADMAP.md phase 0 for what "done" means here.

create table if not exists company_brain (
    id integer primary key default 1,
    data jsonb not null,
    updated_at timestamptz not null default now(),
    constraint company_brain_singleton check (id = 1)
);

create table if not exists work_orders (
    id text primary key,
    team text not null check (team in ('growth', 'technical', 'finance')),
    skill text not null,
    inputs jsonb not null default '{}',
    acceptance_criteria jsonb not null default '[]',
    tier text not null check (tier in ('auto', 'approve', 'blocked')),
    depends_on jsonb not null default '[]',
    status text not null default 'pending'
        check (status in ('pending', 'in_progress', 'done', 'bounced')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists drafts (
    id serial primary key,
    work_order_id text not null references work_orders(id),
    team text not null,
    skill text not null,
    content jsonb not null,
    tier text not null check (tier in ('auto', 'approve', 'blocked')),
    verdict text check (verdict in ('pass', 'fail')),
    failed_checks jsonb not null default '[]',
    required_fixes jsonb not null default '[]',
    retry_count integer not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists agent_run_logs (
    id serial primary key,
    agent text not null,
    skill text not null,
    work_order_id text references work_orders(id),
    step text not null,
    inputs jsonb not null default '{}',
    output jsonb not null default '{}',
    verdict text,
    created_at timestamptz not null default now()
);

insert into company_brain (id, data)
values (1, '{
    "company": {"name": null, "one_liner": null, "stage": "idea"},
    "product": {"what_it_does": null, "current_state": null, "live_url": null},
    "icp": {"who": null, "evidence": null},
    "positioning": {"differentiation": null, "messaging": null},
    "constraints": {"runway_months": null, "monthly_burn": null, "founder_hours_per_week": null},
    "decisions": [],
    "priorities": []
}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Dashboard (ROADMAP phase 5) additions. Idempotent: safe to re-apply to an
-- existing database with `docker exec -i founder-agents-postgres psql -U
-- founder_agents -d founder_agents < db/schema.sql`.
-- ---------------------------------------------------------------------------

-- Design is the fourth team (DECISIONS.md D6); the original check predates it.
-- Escalated = bounced twice, now with the founder (review_rubric).
-- Stopped = the founder stopped it from the dashboard; the runner drops it.
alter table work_orders drop constraint if exists work_orders_team_check;
alter table work_orders add constraint work_orders_team_check
    check (team in ('growth', 'technical', 'finance', 'design'));
alter table work_orders drop constraint if exists work_orders_status_check;
alter table work_orders add constraint work_orders_status_check
    check (status in ('pending', 'in_progress', 'done', 'bounced', 'escalated', 'stopped'));

-- A founder message sent to the Orchestrator from the dashboard.
create table if not exists briefs (
    id serial primary key,
    body text not null,
    status text not null default 'sent'
        check (status in ('sent', 'answered', 'broken')),
    response text,
    error text,
    created_at timestamptz not null default now(),
    answered_at timestamptz
);

-- One line, in the founder's terms, of what the work order is for.
alter table work_orders add column if not exists summary text;
alter table work_orders add column if not exists brief_id integer references briefs(id);

-- A draft's headline, its contradiction block (business_rules), and the
-- founder's decision on it. Drafts are never deleted; decisions are recorded.
alter table drafts add column if not exists summary text;
alter table drafts add column if not exists contradiction jsonb;
alter table drafts add column if not exists founder_decision text
    check (founder_decision in ('approved', 'declined'));
alter table drafts add column if not exists decision_note text;
alter table drafts add column if not exists decided_at timestamptz;

-- Every playbook edit made from the dashboard. A reason is required, the
-- same rule company_brain applies to decisions.
create table if not exists playbook_amendments (
    id serial primary key,
    skill_path text not null,
    reason text not null check (length(trim(reason)) > 0),
    before_text text not null,
    after_text text not null,
    created_at timestamptz not null default now()
);

-- A contradiction stays on the desk until the founder records a decision on
-- it. Never auto-resolved.
alter table drafts add column if not exists contradiction_resolved_at timestamptz;

-- harness/runner.py marks a brief working once the Orchestrator has planned
-- it, until every work order is in and the Orchestrator has answered.
-- Stopped = the founder stopped it, with all its unfinished work orders.
alter table briefs drop constraint if exists briefs_status_check;
alter table briefs add constraint briefs_status_check
    check (status in ('sent', 'working', 'answered', 'broken', 'stopped'));

-- What the agents are doing, one row per step, written by harness/runner.py:
-- running while an agent works, then done, failed or stopped. `detail`
-- carries what went wrong or what the model is doing about it, in plain
-- words. The dashboard's live bar and Activity page read it.
create table if not exists activity (
    id serial primary key,
    brief_id integer references briefs(id),
    work_order_id text references work_orders(id),
    draft_id integer references drafts(id),
    agent text not null,
    action text not null,
    model text,
    status text not null default 'running'
        check (status in ('running', 'done', 'failed', 'stopped')),
    detail text,
    started_at timestamptz not null default now(),
    finished_at timestamptz
);
create index if not exists activity_started_idx on activity (started_at desc);

-- The office's switch: while paused, the runner starts no new work for this
-- company. Exactly one row.
create table if not exists office_state (
    id integer primary key default 1 check (id = 1),
    paused boolean not null default false,
    paused_at timestamptz
);
insert into office_state (id) values (1) on conflict (id) do nothing;
