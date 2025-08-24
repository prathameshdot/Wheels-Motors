create table reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  type text,
  data jsonb,
  created_at timestamp default now()
);
