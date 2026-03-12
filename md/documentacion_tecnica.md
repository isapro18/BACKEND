# Documentación Técnica del Backend

## Arquitectura del Sistema
Se implementó una arquitectura de dos capas para separar la lógica de negocio de la persistencia de datos:
1. **API RESTful (Express - Puerto 3000):** Recibe las peticiones del cliente, aplica middlewares de seguridad, procesa las reglas de negocio e interactúa con la base de datos.
2. **Capa de Datos (json-server - Puerto 4000):** Actúa exclusivamente como almacenamiento.

## Middleware de Seguridad (`auth.middleware.js`)
Se crearon dos barreras de seguridad:
* `verifyToken`: Extrae y valida el token enviado en los headers (`Authorization: Bearer <token>`).
* `isAdmin`: Verifica que el rol extraído del token corresponda a un administrador, bloqueando el acceso a usuarios estándar.

## Endpoints Implementados (Prefijo `/api`)

### 🔐 Autenticación (`/api/auth`)
* `POST /login`: Valida el documento y que la contraseña coincida con los últimos 4 dígitos. Retorna un token de sesión.

### 👥 Usuarios (`/api/users`) - *Requieren Token y Rol Admin*
* `GET /`: Retorna todos los usuarios.
* `GET /:id`: Retorna un usuario específico.
* `POST /`: Crea un nuevo usuario (Por defecto: rol user, status activo).
* `PUT /:id`: Actualiza la información completa de un usuario.
* `PATCH /:id/status`: Activa o desactiva un usuario en el sistema.
* `DELETE /:id`: Elimina un usuario de la base de datos.

### 📋 Tareas (`/api/tasks`) - *Requieren Token*
* `GET /`: Lista las tareas.
* `POST /`: Crea una tarea (soporta arreglo de `userIds`).
* `POST /:taskId/assign`: Asigna nuevos usuarios a una tarea existente sin borrar los anteriores.
* `GET /:taskId/users`: Retorna los objetos completos de los usuarios asignados a una tarea.
* `DELETE /:taskId/users/:userId`: Remueve a un usuario específico de una tarea.