# Backend — Reloj Checador API

API REST en Node.js + Express + SQLite (`better-sqlite3`) que administra
empleados y registros de entrada/salida.

## Instalación

```bash
cp .env.example .env
npm install
npm run seed   # crea el usuario administrador (ADMIN_EMAIL / ADMIN_PASSWORD en .env)
npm run dev    # http://localhost:3000
```

## Autenticación

Todas las rutas (excepto `/api/auth/login` y `/api/health`) requieren el
header:

```
Authorization: Bearer <token>
```

El token se obtiene al iniciar sesión y expira según `JWT_EXPIRES_IN`.

## Endpoints

### Auth
| Método | Ruta              | Descripción                          |
|--------|-------------------|---------------------------------------|
| POST   | `/api/auth/login` | `{ email, password }` → `{ token, employee }` |
| GET    | `/api/auth/me`    | Datos del empleado autenticado        |

### Empleados (solo admin)
| Método | Ruta                | Descripción                                   |
|--------|---------------------|------------------------------------------------|
| GET    | `/api/employees`    | Lista empleados                                 |
| POST   | `/api/employees`    | `{ name, email, password?, role? }` — crea empleado (si no mandas `password`, se genera una temporal) |
| PATCH  | `/api/employees/:id`| `{ active?, name?, role? }` — activar/desactivar/editar |

### Checado (reloj checador)
| Método | Ruta                       | Auth   | Descripción |
|--------|----------------------------|--------|-------------|
| POST   | `/api/timeclock/check`     | propio | `{ type: 'in'|'out', clientUuid, biometricVerified: true }` registra el checado. Rechaza si no alterna correctamente entrada/salida. |
| GET    | `/api/timeclock/today`     | propio | Estado actual (`in`/`out`) y cuál es el siguiente tipo esperado |
| GET    | `/api/timeclock/history`   | propio | Historial propio (`?from=&to=` ISO 8601) |
| GET    | `/api/timeclock/records`   | admin  | Historial de todos los empleados (`?employeeId=&from=&to=`) |
| GET    | `/api/timeclock/export`    | admin  | Descarga CSV de los registros filtrados |

## Notas de seguridad

- La huella digital se valida **en el propio celular** (BiometricPrompt en
  Android, Face ID/Touch ID en iOS); el servidor nunca recibe datos
  biométricos. El flag `biometricVerified` es una confirmación del cliente,
  por lo que en un despliegue real conviene reforzarlo con: dispositivos
  vinculados por empleado, TLS obligatorio y, si se requiere mayor certeza,
  atestiguación de la app (Play Integrity / App Attest).
- Cambia `JWT_SECRET` antes de desplegar a producción.
- Para producción se recomienda migrar de SQLite a Postgres/MySQL si habrá
  varias instancias del servidor corriendo a la vez.
