create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  full_name text,
  phone text,
  status text default 'active',
  created_at timestamp default now()
);

-- Insert initial admin user
insert into users (id, email, full_name, phone, status, created_at)
values (
  uuid_generate_v4(),
  'admin@yourdomain.com',
  'Super Admin',
  '+911234567890',
  'active',
  now()
);
