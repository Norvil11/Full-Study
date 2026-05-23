# 🔐 Configuración de Autenticación — Supabase

## 1. Crear proyecto en Supabase
Ingresa a https://app.supabase.com y crea un nuevo proyecto.

## 2. Crear tabla de perfiles
En el SQL Editor de Supabase ejecuta:

```sql
-- Tabla de perfiles (se llena automáticamente al registrarse)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- RLS: cada usuario solo ve su perfil, los admins ven todos
alter table public.profiles enable row level security;

create policy "Perfiles visibles para usuarios autenticados"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Usuarios pueden actualizar su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Usuarios pueden insertar su propio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);
```

## 3. Copiar credenciales
En Supabase → Settings → API copia:
- Project URL → `VITE_SUPABASE_URL`
- anon/public key → `VITE_SUPABASE_ANON_KEY`

```bash
cp .env.example .env
# Edita .env con tus valores reales
```

## 4. Reiniciar servidor
```bash
npm run dev
```

¡Listo! El login/registro funcionará con credenciales reales guardadas en Supabase.
