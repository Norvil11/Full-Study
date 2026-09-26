# ⚡ MyWorkspace

Organizador de tareas personal: tablero por estado, tipos de tarea (Trabajo, Universidad, Otro), calendario mensual/semanal y sincronización con Google Calendar. Cada usuario ve y gestiona solo sus propias tareas.

## Inicio rápido

```bash
cd myworkspace
npm install
npm run dev
```

## Configuración

1. Copia `.env.example` → `.env`
2. Rellena tus credenciales de Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
3. (Opcional) Agrega `VITE_GOOGLE_CLIENT_ID` para conectar Google Calendar
4. Reinicia el servidor de desarrollo

Ver `SETUP_AUTH.md` para la configuración de autenticación en Supabase.

## Stack

- React 18 + Vite
- Supabase (auth + DB + storage)
- Google Identity Services + Google Calendar API v3
- lucide-react (iconos)
