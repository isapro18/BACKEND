# Informe: Flujo CRUD Frontend-Backend (Backend Express + MySQL)

## 1) Objetivo
Entender una peticion CRUD completa, desde que el usuario inicia una accion en el frontend, hasta que el backend responde y el frontend lo muestra.

## 2) Lo que hace el FRONTEND `Nano5402/FRONTEND` (estado actual)
Archivos relevantes:
- `src/script.js`
- `src/services/tareasService.js`
- `src/api/usuariosApi.js`
- `src/api/tareasApi.js`
- `src/config/constants.js`

Flujo de login y obtencion de datos (como esta hoy):
1. `src/script.js`: el formulario de login llama a `procesarBusqueda(documento)` al hacer submit.
2. `src/services/tareasService.js`: `procesarBusqueda(documento)`:
   - usa `fetchUsuarioPorDocumento(documento)` para encontrar el usuario
   - si el usuario existe, usa `fetchTareasPorUsuario(usuario.id)` para traer sus tareas
3. `src/api/usuariosApi.js` hace `fetch(${API_URL}/users)` y luego filtra por `document` en el frontend.
4. `src/api/tareasApi.js` hace `fetch(${API_URL}/tasks)` y filtra tareas localmente.

Detalles importantes:
- El frontend usa `API_URL = "http://localhost:4000"`.
- En este flujo **no** se usa `POST /api/auth/login`.
- En este flujo **no** se envia `Authorization: Bearer <token>`.

## 3) Lo que hace el BACKEND de tu repo (estado actual)
Archivos relevantes:
- `src/app.js` (monta rutas con prefijo `/api`)
- `src/routes/users.routes.js` (rutas usuarios protegidas por JWT)
- `src/middlewares/auth.middleware.js` (`verifyToken` e `isAdmin`)
- `src/controllers/users.controller.js` (CREATE/UPDATE en MySQL)
- `src/config/db.js` (pool de MySQL)

Flujo correcto para CRUD de usuarios en este backend:
1. Login: `POST /api/auth/login`
   - body: `{ "document": "<documento>" }`
   - backend busca el usuario en MySQL y genera un JWT con `JWT_SECRET`
2. Crear usuario: `POST /api/users`
   - requiere header: `Authorization: Bearer <token>`
   - requiere que `role === 'admin'`
3. Actualizar usuario: `PUT /api/users/:id`
   - mismas protecciones (token + admin)
4. Borrado y cambios de estado (segun rutas del backend):
   - igualmente protegidos por JWT en este repositorio

CREATE/UPDATE en MySQL:
- `createUser` hace `INSERT INTO users (...)`
- `updateUser` hace `UPDATE users SET ... WHERE id = ?`

## 4) Desfase encontrado (por que el frontend “como esta hoy” puede fallar)
Comparacion:
- El frontend llama a `/users` y `/tasks` (sin prefijo `/api`), en `localhost:4000`.
- El backend espera rutas con prefijo `/api` y corre en `PORT=3000`.
- El backend protege CRUD con JWT:
  - si no se envia `Authorization: Bearer <token>`, se recibe `401 Token no proporcionado`
  - si no es admin, se recibe `403 Se requieren permisos de administrador`

## 5) Como completar el flujo CRUD “100% alineado”
Para que el frontend y el backend trabajen juntos:
1. Actualizar `API_URL` para apuntar a tu backend (por ejemplo `http://localhost:3000`).
2. Cambiar endpoints para incluir prefijo `/api`:
   - en vez de `/users` -> `/api/users`
   - en vez de `/tasks` -> `/api/tasks`
3. Implementar login usando `POST /api/auth/login`.
4. Guardar el token JWT y enviarlo en `Authorization: Bearer <token>` en todas las rutas protegidas.

## 6) Evidencia recomendada
- Usar Postman para probar:
  - `POST /api/auth/login` (obtener token)
  - `POST /api/users` (CREATE) con token admin
  - `PUT /api/users/:id` (UPDATE) con token admin

