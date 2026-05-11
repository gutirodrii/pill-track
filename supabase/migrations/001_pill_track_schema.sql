create extension if not exists pgcrypto;

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 120),
  color text not null default '#2f6d4f' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intake_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_id uuid not null references public.medications(id) on delete cascade,
  taken_on date not null,
  taken_at time not null,
  dose text,
  effect_score smallint check (effect_score between 1 and 5),
  symptoms text[] not null default '{}',
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medications_user_id_idx on public.medications(user_id);
create index if not exists intake_logs_user_day_idx on public.intake_logs(user_id, taken_on desc, taken_at desc);
create index if not exists intake_logs_medication_day_idx on public.intake_logs(medication_id, taken_on desc);

alter table public.medications enable row level security;
alter table public.intake_logs enable row level security;

create policy "Users can read their medications"
  on public.medications for select
  using (auth.uid() = user_id);

create policy "Users can create their medications"
  on public.medications for insert
  with check (auth.uid() = user_id);

create policy "Users can update their medications"
  on public.medications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their medications"
  on public.medications for delete
  using (auth.uid() = user_id);

create policy "Users can read their intake logs"
  on public.intake_logs for select
  using (auth.uid() = user_id);

create policy "Users can create their intake logs"
  on public.intake_logs for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.medications
      where medications.id = intake_logs.medication_id
        and medications.user_id = auth.uid()
    )
  );

create policy "Users can update their intake logs"
  on public.intake_logs for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.medications
      where medications.id = intake_logs.medication_id
        and medications.user_id = auth.uid()
    )
  );

create policy "Users can delete their intake logs"
  on public.intake_logs for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists medications_set_updated_at on public.medications;
create trigger medications_set_updated_at
  before update on public.medications
  for each row execute function public.set_updated_at();

drop trigger if exists intake_logs_set_updated_at on public.intake_logs;
create trigger intake_logs_set_updated_at
  before update on public.intake_logs
  for each row execute function public.set_updated_at();
