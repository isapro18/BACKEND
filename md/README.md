# Backend - Task App (Gestión de Tareas)

##  Propósito del Proyecto
Este proyecto es el núcleo (Backend) de una **Task App** (Aplicación de Gestión de Tareas) colaborativa. Su propósito principal es permitir a los equipos organizar, asignar y hacer seguimiento de sus actividades diarias de manera eficiente. 

A diferencia de una lista de tareas básica, esta aplicación implementa **asignación múltiple** (una tarea puede pertenecer a varias personas simultáneamente) y un sistema de **seguridad basado en roles** (Administradores y Usuarios), garantizando que solo el personal autorizado pueda gestionar los recursos humanos del sistema.

##  Requisitos y Levantamiento del Entorno

Para que el proyecto funcione correctamente, es **obligatorio** levantar dos servidores en terminales distintas, ya que la API y la Base de Datos operan de forma independiente.

### Paso 1: Levantar la Base de Datos (json-server)
Ubicarse en la carpeta `Base/` y ejecutar:
\`\`\`bash
npx json-server --watch db.json --port 4000
\`\`\`

### Paso 2: Levantar el Servidor Express (API)
Ubicarse en la raíz del backend y ejecutar:
\`\`\`bash
npm run dev
\`\`\`
El servidor de Express quedará escuchando en el puerto `3000`.

##  Tecnologías Usadas
* Node.js / Express.js
* Autenticación (Tokens simulados y validación de credenciales)
* CORS y fetch API nativo
* json-server (Mock Database)