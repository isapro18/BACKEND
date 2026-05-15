# Planificación Arquitectónica: Matriz RBAC

Este documento define la lógica de negocio para el control de acceso de la Task App. Se implementa un modelo de permisos atómicos para garantizar que cada acción en el sistema esté debidamente autorizada.

## Matriz de Roles y Permisos

| Rol en Task App | Permiso Específico | Campo de Acción Permitido (Descripción) |
| :--- | :--- | :--- |
| **SuperAdmin** | `system.manage.all` | Gestión total de roles, permisos y purga de base de datos. |
| | `users.delete.all` | Eliminación permanente de registros de usuarios (Hard Delete). |
| | `users.update.role` | Capacidad de modificar el nivel de acceso de otros usuarios. |
| **Profesor (Gestor)** | `users.create` | Registro y alta de nuevos estudiantes en la plataforma. |
| | `users.read.all` | Visualización del listado completo de usuarios y sus perfiles. |
| | `users.update.status` | Capacidad de activar o suspender el acceso de cualquier estudiante. |
| | `tasks.create.multiple`| Creación y asignación masiva de tareas a uno o varios alumnos. |
| | `tasks.read.all` | Visualización de todas las tareas globales para seguimiento docente. |
| | `tasks.update.all` | Edición de contenido y fechas en cualquier tarea del sistema. |
| | `tasks.delete.all` | Eliminación de tareas (individual o masiva) según sea necesario. |
| **Estudiante (Colaborador)**| `tasks.read.own` | Acceso exclusivo a visualizar sus tareas asignadas. |
| | `tasks.update.status.own`| Gestión del flujo de trabajo de sus propias actividades. |
| **Auditor (Invitado)** | `users.read.all` | Solo lectura de usuarios para procesos de auditoría externa. |
| | `tasks.read.all` | Solo lectura de tareas para extracción de métricas de avance. |

---
**Nota:** La implementación técnica validará estos permisos mediante JWT y Middlewares dinámicos.