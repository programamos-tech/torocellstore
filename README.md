# TOROCELL STORE

Copia independiente del sistema de gestión (POS / inventario / créditos / traslados / tienda web) para **TOROCELL STORE**.

> Este repositorio **no** está ligado a Zonat. El proyecto original en `~/Developer/zonat` no se modifica.

## Requisitos

- Node 20+
- Docker Desktop
- Supabase CLI (`supabase`)

## Arranque local (todos los juguetes)

```bash
cd ~/Developer/torocell-store

# 1) Base de datos local (API :54331, Studio :54333, DB :54332)
npm run db:start
# o: supabase start

# 2) Aplicar migraciones + seed Torocell
npm run db:reset

# 3) Variables de entorno (tras el start, copia keys de `supabase status`)
cp .env.example .env.local
# edita .env.local con las keys que imprime `supabase status -o env`

# 4) App en http://localhost:3001
npm install
npm run dev
```

### Login local

- Email: `wilson@torocell.com`
- Password: `admin123`

### Puertos (para no chocar con Zonat en :3000 / :54321)

| Servicio | Puerto |
|----------|--------|
| Next.js | 3001 |
| Supabase API | 54331 |
| Postgres | 54332 |
| Studio | 54333 |

## Backups desde Zonat

En `backups/`:

- `zonat-schema.sql` — esquema public volcado desde Zonat (referencia)
- `zonat-data.sql` — datos (si se generó el dump) para restaurar opcionalmente

Para un negocio nuevo lo normal es **schema + seed limpio** (lo que hace `db:reset`). El dump completo es opcional para demos/migración.

## Infra propia más adelante

1. Crear proyecto Supabase nuevo (remoto) para Torocell
2. `supabase link --project-ref <ref>`
3. `supabase db push`
4. Crear proyecto Vercel y apuntar env vars
5. Dominio / tienda web propia

