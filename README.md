# ⚡ Hanter Workspace

Plataforma interna de gestión de tareas — estilo Linear/Vercel.

## Inicio rápido

```bash
cd hanter-workspace
npm install
npm run dev
```

La app funciona con datos mock desde el primer segundo.

## Configurar Supabase (opcional)

1. Copia `.env.example` → `.env`
2. Rellena tus credenciales de Supabase
3. Crea la tabla `profiles` con campos: `id, email, full_name, avatar_url`
4. Reinicia el servidor de desarrollo

## Stack

- React 18 + Vite
- Tailwind CSS
- Supabase (auth + DB)
- lucide-react (iconos)
