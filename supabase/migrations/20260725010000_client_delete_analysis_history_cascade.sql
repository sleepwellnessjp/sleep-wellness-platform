-- クライアント削除時に analysis_history も残さない
-- （従来は ON DELETE SET NULL + DELETE ポリシー無し）

do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'analysis_history'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'client_id'
  limit 1;

  if fk_name is not null then
    execute format(
      'alter table public.analysis_history drop constraint %I',
      fk_name
    );
  end if;
end $$;

alter table public.analysis_history
  add constraint analysis_history_client_id_fkey
  foreign key (client_id)
  references public.clients (id)
  on delete cascade;

drop policy if exists "analysis_history_delete_own" on public.analysis_history;
create policy "analysis_history_delete_own"
  on public.analysis_history for delete
  using (auth.uid() = user_id or public.is_admin_or_above());
