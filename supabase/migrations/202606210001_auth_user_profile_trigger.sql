create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    name,
    company,
    role,
    timezone,
    language,
    email_verified
  )
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'company', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'role', '')), ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'timezone'), ''), 'Asia/Seoul'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'language'), ''), 'ja'),
    new.email_confirmed_at is not null
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = coalesce(excluded.name, public.users.name),
    company = coalesce(excluded.company, public.users.company),
    role = coalesce(excluded.role, public.users.role),
    timezone = coalesce(excluded.timezone, public.users.timezone),
    language = coalesce(excluded.language, public.users.language),
    email_verified = excluded.email_verified;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
