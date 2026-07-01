# 🏆 Porra Mundial 2026

Web app para jugar una porra (quiniela) del Mundial 2026 (USA · Canadá · México) con la peña. Cada participante predice el marcador de los 72 partidos de fase de grupos, todo el cuadro de eliminatorias, 10 trofeos individuales y el podio final. Los puntos se calculan solos en cuanto el organizador introduce los resultados oficiales.

## Stack

- **Backend**: Node.js + Express (`server.js`, `routes/api.js`)
- **Base de datos**: PostgreSQL (`db.js`, vía el paquete `pg`)
- **Frontend**: una sola página estática sin framework (`public/index.html`), servida directamente por Express
- **Despliegue**: Railway (`railway.json`, builder `nixpacks`)

No hay build step ni frontend framework: todo el HTML/CSS/JS de la app vive en `public/index.html`.

## Estructura del proyecto

```
├── server.js          # Arranca Express, sirve /public y monta /api
├── db.js              # Pool de PostgreSQL + creación automática de tablas
├── routes/api.js       # Todos los endpoints (participantes, login, predicciones, resultados, admin)
├── public/index.html   # Toda la app frontend (UI + lógica de puntuación)
├── railway.json        # Config de despliegue en Railway
└── package.json
```

## Requisitos

- Node.js 18+
- Una base de datos PostgreSQL (local, Railway, Supabase, etc.)

## Puesta en marcha en local

1. Instala dependencias:
   ```bash
   npm install
   ```

2. Crea un archivo `.env` en la raíz del proyecto con:
   ```bash
   DATABASE_URL=postgres://usuario:password@host:puerto/basededatos
   PORT=3000
   ADMIN_KEY=elige-una-clave-secreta-para-el-panel-admin
   ```
   - `DATABASE_URL`: cadena de conexión a tu Postgres.
   - `PORT`: puerto donde corre el servidor (opcional, por defecto 3000).
   - `ADMIN_KEY`: clave que se pide para entrar en la pestaña **⚙️ Admin** de la app (gestionar participantes y publicar resultados). Guárdala solo tú, no la compartas con la peña.

3. Arranca el servidor:
   ```bash
   npm run dev     # con nodemon, recarga en caliente
   # o
   npm start       # producción
   ```

4. Abre `http://localhost:3000` (o el puerto que hayas puesto).

## Base de datos

**No hace falta ejecutar ningún script SQL a mano.** Al arrancar, `server.js` llama a `initDb()` (`db.js`), que crea las tablas si no existen:

| Tabla          | Para qué sirve |
|----------------|-----------------|
| `participants` | Jugadores de la porra: `id`, `name` (único), `pin_hash` (PIN cifrado con SHA-256), `created_at` |
| `predictions`  | Un registro por participante con todas sus predicciones en JSON (`data`): marcadores de grupos, cuadro eliminatorio, trofeos y podio |
| `results`      | Fila única (`id=1`) con los resultados oficiales en JSON, que el admin va rellenando partido a partido |

Solo necesitas apuntar `DATABASE_URL` a una base de datos Postgres vacía (o ya existente, es idempotente) y el propio servidor la deja lista la primera vez que arranca.

### Crear una base de datos Postgres rápida

- **Railway**: añade un plugin "PostgreSQL" al proyecto, copia la `DATABASE_URL` que te genera a las variables del servicio.
- **Supabase**: crea un proyecto, usa la connection string de "Connection Pooling" como `DATABASE_URL`.
- **Local**: `createdb porra_mundial` y usa `postgres://localhost:5432/porra_mundial` (ajusta usuario/password según tu instalación).

## Despliegue en Railway

El repo ya incluye `railway.json` (`nixpacks` + `node server.js`). Pasos:

1. Crea un proyecto en Railway y conéctalo a este repo (o usa el CLI/MCP de Railway).
2. Añade un plugin de PostgreSQL al proyecto (o usa `add_reference_variable`/variables) para obtener `DATABASE_URL` automáticamente.
3. Configura las variables de entorno del servicio: `DATABASE_URL`, `ADMIN_KEY` (Railway pone `PORT` automáticamente, no hace falta fijarlo).
4. Cada `git push` a la rama conectada dispara un nuevo deploy.

## Cómo se juega

1. **Entrar**: cada participante elige un nombre único y un PIN de 4-6 dígitos (se guarda cifrado, nunca en texto plano).
2. **⚽ Grupos**: predice el marcador de los 72 partidos de fase de grupos. Se bloquea automáticamente en cuanto arranca el Mundial (`KICKOFF`, 11 jun 2026 19:00 UTC).
3. **⚡ Eliminatoria**: predice el cuadro completo (Dieciseisavos → Octavos → Cuartos → Semis → Tercer puesto → Final), incluyendo quién gana en penaltis si hay empate. Las predicciones de Dieciseisavos están actualmente bloqueadas (`R32_LOCKED=true` en `public/index.html`); el resto de rondas se bloquea partido a partido en cuanto el admin publica su resultado oficial.
4. **🏅 Trofeos** y **🥇 Podio**: predicciones de texto libre (Balón de Oro, Bota de Oro, etc.) y del podio final.
5. **📊 Ranking** y **👥 Rivales**: puntuación en vivo y puedes espiar las predicciones de otros participantes una vez hay resultados.
6. **⚙️ Admin**: pestaña protegida por `ADMIN_KEY` donde el organizador va introduciendo los resultados oficiales partido a partido (grupos y cuadro eliminatorio), gestiona participantes y resetea PINs.

## Puntuación (máx. 403 pts)

| Fase | Partidos | Clasificado | Marcador exacto | Bonus penaltis | Máx. |
|---|---|---|---|---|---|
| Fase de Grupos | 72 | 1 pt | 2 pts | — | 216 |
| Dieciseisavos | 16 | 1 pt | 3 pts | +1 pt | 80 |
| Octavos | 8 | 1 pt | 3 pts | +1 pt | 40 |
| Cuartos | 4 | 1 pt | 3 pts | +1 pt | 20 |
| Semifinales | 2 | 1 pt | 3 pts | +1 pt | 10 |
| Tercer puesto | 1 | 1 pt | 3 pts | +1 pt | 5 |
| Final | 1 | 1 pt | 3 pts | +1 pt | 5 |
| Trofeos individuales | 10 | — | 2 pts c/u | — | 20 |
| Podio (campeón/subcampeón/3.º) | 3 | — | 3/2/2 pts | — | 7 |

El bonus de penaltis solo se otorga si el partido se decide realmente en la tanda **y** aciertas qué equipo la gana. La lógica completa vive en `koPts()` y `scoreOf()` dentro de `public/index.html`; la pestaña **📖 Reglas** de la app muestra siempre estos valores en vivo.

## Notas de seguridad

- Los PINs nunca se guardan en texto plano: se hashean con SHA-256 (`hashPin` en `routes/api.js`).
- El panel de Admin exige la cabecera `X-Admin-Key` igual a `ADMIN_KEY`; sin ella, todos los endpoints `/api/admin/*` y las escrituras en `/api/results` devuelven 401.
- No subas tu `.env` ni compartas `ADMIN_KEY` — ya está en `.gitignore`.
