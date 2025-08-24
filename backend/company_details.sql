create table company_details (
  id uuid primary key default uuid_generate_v4(),
  company_name text,
  admin_name text,
  phone text,
  address text,
  logo_url text,
  signature_url text,
  created_at timestamp default now()
);
