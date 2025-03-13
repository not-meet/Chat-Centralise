-- Create users table
create table public.users (
  id uuid references auth.users on delete cascade,
  email text not null,
  full_name text,
  role text not null check (role in ('admin', 'agent')),
  status text not null check (status in ('active', 'inactive')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id),
  unique(email)
);

-- Enable RLS
alter table public.users enable row level security;

-- Create policies
create policy "Users can view their own data" on users
  for select using (auth.uid() = id);

create policy "Admins can view all users" on users
  for select using (
    auth.jwt() ->> 'role' = 'admin'
  );

create policy "Admins can create users" on users
  for insert with check (
    auth.jwt() ->> 'role' = 'admin'
  );

create policy "Admins can update users" on users
  for update using (
    auth.jwt() ->> 'role' = 'admin'
  );

create policy "Admins can delete users" on users
  for delete using (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Create triggers for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger handle_users_updated_at
  before update on public.users
  for each row
  execute function public.handle_updated_at(); 