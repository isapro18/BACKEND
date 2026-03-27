# Flujo Completo de una Peticion CRUD (Front -> Backend -> MySQL)

Este documento explica, de forma didactica y tecnica, como una solicitud generica pasa por todas las etapas del sistema en tu proyecto.

> Nota importante: en este repositorio se ve principalmente el **backend** (Express + MySQL). El **frontend** puede estar en otro repo. En el repo `Nano5402/FRONTEND` el flujo de login/CRUD actualmente no esta alineado 100% con este backend (paths y proteccion con JWT), pero aqui te dejo el flujo “correcto” (el que exige el backend) y tambien “como lo hace tu frontend” para que entiendas el proceso completo.

## 1. Piezas del sistema (que intervienen)

1. Frontend (navegador o app web)
   - Muestra formularios/listados.
   - Llama a la API con HTTP (GET/POST/PUT/PATCH/DELETE).
   - Guarda y reutiliza el token JWT (por ejemplo en memoria o LocalStorage).

2. Backend (Express)
   - Recibe la peticion HTTP.
   - Convierte el body a JSON.
   - Enruta a la funcion correcta (controller).
   - Protege rutas con middleware (verificacion de token y rol admin).

3. Middleware de autenticacion (JWT)
   - `verifyToken`: valida que el header `Authorization` exista y contenga `Bearer <token>`.
   - Verifica el token JWT con `JWT_SECRET` y extrae `id` y `role` en `req.user`.
   - `isAdmin`: permite solo si `req.user.role === 'admin'`.

4. Controller (logica del CRUD)
   - Toma los datos de `req.body` o `req.params`.
   - Ejecuta consultas SQL con `mysql2/promise` (`pool.query`).
   - Devuelve una respuesta JSON con un codigo HTTP adecuado.

5. Base de datos (MySQL)
   - Almacenamiento real de registros.
   - Consultas `INSERT`, `UPDATE`, `SELECT`, etc.

## 2. Ejemplo completo: crear un usuario (RF02 CREATE)

Usamos esta secuencia porque es una peticion CRUD tipica y ademas involucra proteccion por token.

### 2.1 Paso A (Front): pedir token (login)

El frontend (pagina admin) hace login para obtener un token JWT.

Request:
- Metodo: `POST`
- URL: `http://localhost:3000/api/auth/login`
- Headers:
  - `Content-Type: application/json`
- Body (raw JSON):
  ```json
  {
    "document": "1001"
  }
  ```

Backend (como protege esto):
- El endpoint de login no tiene `verifyToken` porque es el que entrega el token.

Respuesta esperada (200 OK):
- JSON con `token` y datos basicos del usuario.

Ejemplo de respuesta:
```json
{
  "msn": "Autenticacion exitosa",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
  "user": {
    "id": 1,
    "name": "....",
    "role": "admin"
  }
}
```

> Punto clave: si el usuario no existe o no es admin, luego no podras crear usuarios.

### 2.2 Paso B (Front): crear usuario usando token

Luego el frontend crea un usuario con:
- Metodo: `POST`
- URL: `http://localhost:3000/api/users`

Headers:
- `Content-Type: application/json`
- `Authorization: Bearer <token>`

Body (raw JSON):
```json
{
  "name": "Carlos Perez",
  "email": "carlos@test.com",
  "document": "12345678",
  "role": "user"
}
```

> Si no mandas el token: veras `401 Token no proporcionado.` (o mensaje equivalente).
> Si mandas token pero no es admin: veras `403 Se requieren permisos de administrador.`

### 2.3 Paso C (Backend): flujo interno en Express

#### 2.3.1 Express configura JSON y monta rutas
Tu `src/app.js` incluye:
- `app.use(cors())`
- `app.use(express.json())` para parsear el body JSON
- `app.use('/api/auth', authRoutes)`
- `app.use('/api/users', userRoutes)`

#### 2.3.2 Enrutamiento + middleware
En `src/routes/users.routes.js` la ruta de crear usuario tiene:
- `verifyToken`
- `isAdmin`
- `createUser` (controller)

En orden:
1. Primero corre `verifyToken`.
2. Si el token es valido, corre `isAdmin`.
3. Si role es admin, llega a `createUser`.

### 2.4 Paso D (Middleware): como valida el token

`verifyToken` hace:
1. Lee `req.headers.authorization`.
2. Verifica que empiece con `Bearer `.
3. Extrae el token y valida con `jwt.verify(token, process.env.JWT_SECRET)`.
4. Guarda el resultado en `req.user`.

`isAdmin` hace:
- Si `req.user.role !== 'admin'` -> devuelve `403`.
- Si es admin -> `next()` y sigue al controller.

### 2.5 Paso E (Controller): como hace el CREATE en MySQL

El controller `createUser` usa `mysql2/promise`:
- Lee campos de `req.body`.
- Ejecuta un `INSERT INTO users (...) VALUES (?, ?, ?, ?, ?)`.
- Devuelve un `201 Created` con el `insertId` o un mensaje de exito.

La consulta usa parametros `?` para evitar errores de concatenacion de SQL (y ayudar con seguridad).

### 2.6 Paso F (Respuesta): como vuelve al frontend

El backend responde JSON.
Ejemplo de respuesta:
```json
{
  "msn": "Usuario creado con exito",
  "id": 10
}
```

El frontend:
1. Recibe el JSON.
2. Muestra mensaje de exito (por ejemplo: "Usuario creado").
3. Actualiza la lista (puede hacer un GET /api/users despues).

## 3. Ejemplo completo: actualizar un usuario (RF04 UPDATE)

### 3.1 Paso A (Front): mandar update con PUT

Request:
- Metodo: `PUT`
- URL: `http://localhost:3000/api/users/:id`

Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

Body:
```json
{
  "name": "Carlos Perez Actualizado",
  "email": "carlos.actualizado@test.com",
  "document": "12345678",
  "role": "user"
}
```

### 3.2 Paso B-F (Backend): igual que CREATE hasta llegar al controller

Para `PUT /api/users/:id`:
- En rutas: `verifyToken` + `isAdmin` + `updateUser`.
- Middleware valida token y admin.
- Controller ejecuta un `UPDATE users SET ... WHERE id = ?`.
- Responde con `200 OK` si actualizo.

Codigo HTTP tipico:
- `404` si el id no existe.
- `403` si no es admin.
- `401` si no hay token.
- `200` si actualizo.

## 4. Flujo generico CRUD (vista rapida)

1. Frontend llama a un endpoint.
2. Express parsea JSON (express.json).
3. Router detecta la ruta y valida middleware:
   - `verifyToken` (token valido y decodificado a req.user)
   - `isAdmin` (role admin)
4. Controller ejecuta SQL con `pool.query`.
5. Backend responde JSON con un status HTTP.
6. Frontend muestra el resultado y actualiza la UI.

## 5. Errores comunes y por que ocurren

1. `401 Token no proporcionado`
   - Falta header `Authorization` o no empieza con `Bearer `.

2. `403 Token invalido o expirado`
   - Tu token ya expiro, o `JWT_SECRET` no coincide.

3. `403 Se requieren permisos de administrador`
   - El usuario del token tiene `role` distinto de `admin`.

4. `404 Usuario no encontrado`
   - No existe registro para ese `id` o ese `document`.

5. `500 Error al crear/actualizar`
   - Tabla/columnas no existen, problemas de BD, etc.

## 6. Evidencia con Postman (que guardar)

Para tu PR:
1. Captura o evidencia del login (`POST /api/auth/login`) con token.
2. Captura o evidencia del CREATE (`POST /api/users`) con status `201`.
3. Captura o evidencia del UPDATE (`PUT /api/users/:id`) con status `200`.

Guarda exportaciones de Postman en la carpeta `postman/`.

## 7. Flujo real en el FRONTEND `Nano5402/FRONTEND` (como esta hoy)

En el repo `FRONTEND_remote` (clonado desde `https://github.com/Nano5402/FRONTEND`), el archivo `src/script.js` maneja la pantalla de login:
- Al presionar `submit` del formulario, llama a `procesarBusqueda(documento)`.
- Luego renderiza la vista de Estudiante o Profesor.

La funcion `procesarBusqueda(documento)` esta en `src/services/tareasService.js` y hace:
1) Llama a `fetchUsuarioPorDocumento(documento)` desde `src/api/usuariosApi.js`.
2) Si encuentra el usuario, llama a `fetchTareasPorUsuario(usuario.id)` desde `src/api/tareasApi.js`.
3) Retorna `{ usuario, tareas }` para que el frontend lo muestre.

Importante: el FRONTEND “como esta hoy”:
- Usa `API_URL = "http://localhost:4000"` (en `src/config/constants.js`).
- Hace `fetch(`${API_URL}/users`)` y `fetch(`${API_URL}/tasks`)`.
- No llama a `POST /api/auth/login`.
- No envia el header `Authorization: Bearer <token>` en esas requests.

## 8. Flujo que exige TU BACKEND (como debe quedar para funcionar con proteccion JWT)

Tu BACKEND (Express) monta las rutas asi:
- `POST /api/auth/login` (NO requiere token; genera token)
- `POST /api/users` (requiere `verifyToken` + `isAdmin`)
- `PUT /api/users/:id` (requiere `verifyToken` + `isAdmin`)

Por eso, para que el FRONTEND complete el flujo CRUD real, debe:
1) Hacer login en `POST /api/auth/login` con body:
   - `{ "document": "<documento>" }`
2) Guardar el `token` que devuelve.
3) En cada request protegida (`/api/users`, `/api/tasks` en la mayoria de casos), enviar:
   - `Authorization: Bearer <token>`

## 9. Desfase encontrado (para que entiendas por que a veces falla)

Al comparar frontend vs backend:
- El frontend llama a endpoints tipo `/users` y `/tasks` con `API_URL=localhost:4000`.
- Tu backend actual espera prefijo `/api` y corre en `PORT=3000`.
- Ademas, tu backend protege CRUD con JWT (`verifyToken` y `isAdmin`).

Por eso una pagina puede “cargar usuarios” si el backend anterior era publico, pero con este backend protegido debes implementar el login + token en el frontend.

