create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  type text, -- buy/sell
  make text,
  model text,
  year int,
  price numeric,
  mileage numeric,
  reg_date date,
  is_insured boolean default false,
  is_new boolean default false,
  photos text[], -- array of photo URLs
  extra jsonb, -- dynamic fields for add/sell vehicle
  created_at timestamp default now()
);
