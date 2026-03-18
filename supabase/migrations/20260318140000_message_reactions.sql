create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.training_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

create policy "Members can view reactions" on public.message_reactions for select using (true);
create policy "Users can add reactions" on public.message_reactions for insert with check (auth.uid() = user_id);
create policy "Users can remove own reactions" on public.message_reactions for delete using (auth.uid() = user_id);
