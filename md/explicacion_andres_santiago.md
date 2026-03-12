# Memoria de Desarrollo - Andrés Santiago

## ¿Qué hice?
Implementé toda la reestructuración del backend requerida para el proyecto. Esto incluye la creación de un sistema de Autenticación (Login), la protección de rutas mediante roles de usuario, la construcción de un CRUD real para la gestión de usuarios y la reingeniería del modelo de datos de las tareas para soportar la asignación a múltiples personas simultáneamente.

## ¿Por qué lo hice de esta manera?
El desafío principal era implementar seguridad y reglas de negocio complejas usando únicamente un `json-server` (que por defecto no soporta autenticación ni lógica avanzada). 

Lo resolví creando un servidor intermedio con Express.js. Express actúa como un "cerebro" que intercepta las peticiones, hace las validaciones matemáticas (como comprobar que la contraseña sean los últimos 4 dígitos del documento) y gestiona los permisos antes de comunicarse internamente con el `json-server`. Esta separación de responsabilidades asegura que la base de datos nunca sea accedida directamente de forma insegura y cumple con las buenas prácticas de desarrollo.

## ¿Para qué lo hice?
1. **Para cumplir los requerimientos:** Garantizar la administración exclusiva para administradores y permitir la asignación de una tarea a múltiples responsables, algo vital en entornos colaborativos.
2. **Para asegurar la escalabilidad:** Al dejar un servidor Express configurado con Middlewares y rutas modulares, el día de mañana podemos cambiar el `json-server` por una base de datos real (como MongoDB o PostgreSQL) sin tener que reescribir la lógica de nuestros controladores.

---

## Concepto Clave: ¿Qué es un Token y cómo lo usamos?

Un **Token** es esencialmente un pase de seguridad digital (como una manilla VIP en un concierto). En lugar de que el usuario tenga que enviar su documento y contraseña en cada clic que hace en la página, el sistema se lo pide una sola vez en el Login. 

Si las credenciales son correctas, el backend genera un "Token" (una cadena de texto única) y se lo entrega al usuario. A partir de ese momento, el frontend envía ese Token oculto en la cabecera (`Header`) de cada petición. 

En nuestro proyecto, implementé un token simulado con la estructura `token-{id}-{role}`. 
Nuestro Middleware (`auth.middleware.js`) lee ese token, lo desarma, identifica quién es la persona y, lo más importante, lee su `role`. Si la persona intenta entrar a la ruta de eliminar usuarios, el servidor revisa el token: si dice `admin`, lo deja pasar; si dice `user`, le bloquea el acceso con un error 403 (Acceso Denegado).