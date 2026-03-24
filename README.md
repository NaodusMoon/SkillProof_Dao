# SkillProof DAO

Plataforma de reputacion y validacion de proyectos sobre Solana.

El proyecto integra:
- Frontend web (Next.js) con la vista principal `showcase`.
- Backend API (Express + TypeScript) para autenticacion, sesiones y datos persistentes.
- Base de datos PostgreSQL (Supabase).
- Programa on-chain en Rust (carpeta `programs/skillproof`).

## Stack
- Next.js 15
- React 19
- Express 5
- PostgreSQL (`pg`)
- Solana wallet login (Phantom, Solflare, Backpack)
- Rust/Cargo para el programa on-chain

## Requisitos
- Node.js 20+
- npm 10+
- Rust + Cargo (si quieres compilar el programa)

## Configuracion
El backend usa `DATABASE_URL` y `JWT_SECRET`.

Variables opcionales:
- `DATABASE_URL`: cadena de conexion PostgreSQL.
- `JWT_SECRET`: secreto para tokens JWT.
- `PORT`: puerto del API (por defecto `4000`).

Si no defines variables, el backend usa valores por defecto del proyecto.

## Instalacion
```bash
npm install
```

## Ejecutar en desarrollo
```bash
npm run dev
```

Este comando levanta en paralelo:
- Web: `http://localhost:3000`
- API: `http://localhost:4000`

Rutas utiles:
- App principal: `http://localhost:3000`
- Showcase directo: `http://localhost:3000/skillproof-dao-showcase.html`
- Health API: `http://localhost:4000/api/health`

## Build
### Frontend
```bash
npm run build:web
```

### Backend (type-check)
```bash
npm run build:api
```

### Programa Rust
```bash
npm run build:program
```

### Todo
```bash
npm run build
```

## Preview produccion (web)
```bash
npm run preview
```

## Scripts principales
- `npm run dev`: web + api en paralelo.
- `npm run dev:web`: solo Next.js.
- `npm run dev:api`: solo API Express.
- `npm run build:web`: build de Next.js.
- `npm run build:api`: validacion TS del backend.
- `npm run build:program`: `cargo check` del programa.

## Autenticacion
El frontend soporta:
- Login con wallet Solana (nonce + firma + verificacion backend).
- Login por email/password (registro/login real en DB).

Endpoints auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/solana/nonce`
- `POST /api/auth/solana/verify`
- `GET /api/auth/me`

## Persistencia
Al arrancar, el backend inicializa tablas automaticamente (`server/data.ts`) y realiza seed inicial si la DB esta vacia.

## Estructura rapida
- `src/`: app web Next.js.
- `public/skillproof-dao-showcase.html`: interfaz principal actual.
- `server/`: API Express + capa de datos PostgreSQL.
- `programs/skillproof/`: programa Solana en Rust.

## Problemas comunes
- `Failed to fetch` al loguear wallet:
  - Verifica que el API este arriba en `http://localhost:4000/api/health`.
  - Ejecuta `npm run dev` para levantar web y api juntos.
- Wallet no aparece:
  - Instala/activa la extension (Solflare/Phantom/Backpack) y recarga la pagina.
