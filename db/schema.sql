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
