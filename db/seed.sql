insert into public.categories (id, slug, name, type)
select
  gen_random_uuid(),
  v.slug,
  v.name,
  'platform'
from (
  values
    ('nintendo', 'Nintendo'),
    ('playstation', 'PlayStation'),
    ('xbox', 'Xbox'),
    ('sega', 'SEGA'),
    ('atari', 'Atari'),
    ('pc', 'PC'),
    ('acessorios', 'Acessorios'),
    ('perifericos', 'Perifericos'),
    ('pecas-manutencao', 'Pecas/Manutencao'),
    ('mods', 'Mods')
) as v(slug, name)
where not exists (
  select 1
  from public.categories c
  where lower(c.slug) = lower(v.slug)
);
