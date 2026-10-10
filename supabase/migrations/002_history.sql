-- 002: real VASA pickup history per household (from the data/*_houses.json seed file).
-- Each item: { "date": "2026-10-02 11:47:38", "serviced": true, "reason": null }
alter table public.households
  add column if not exists history jsonb not null default '[]'::jsonb;
