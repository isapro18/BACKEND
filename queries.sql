-- ============================================================================
-- TaskApp SENA — Arsenal de Consultas SQL
-- ============================================================================
-- USO: Cada ? es un parámetro que reemplazas con el valor real.
--      En MySQL Workbench puedes sustituir ? por el valor directamente.
--      En el backend ya están parametrizadas, listas para pool.query().
-- ============================================================================


-- ============================================================================
-- SECCIÓN 1 — USUARIOS
-- ============================================================================

-- 1.1  Todos los usuarios con sus roles
SELECT
    u.id,
    u.name,
    u.email,
    u.document,
    u.status,
    u.createdAt,
    GROUP_CONCAT(r.name ORDER BY r.id SEPARATOR ', ') AS roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r       ON ur.role_id = r.id
GROUP BY u.id
ORDER BY u.createdAt DESC;

-- -----------------------------------------------------------------------

-- 1.2  Buscar usuario por documento exacto
SELECT u.id, u.name, u.email, u.document, u.status,
       GROUP_CONCAT(r.name SEPARATOR ', ') AS roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r       ON ur.role_id = r.id
WHERE u.document = ?           -- ej: '1098765432'
GROUP BY u.id;

-- -----------------------------------------------------------------------

-- 1.3  Buscar usuarios cuyo documento contiene ciertos dígitos (LIKE)
SELECT u.id, u.name, u.email, u.document, u.status
FROM users u
WHERE u.document LIKE ?        -- ej: '%1098%'
ORDER BY u.document ASC;

-- -----------------------------------------------------------------------

-- 1.4  Buscar usuarios por nombre (parcial, sin importar mayúsculas)
SELECT u.id, u.name, u.email, u.document, u.status,
       GROUP_CONCAT(r.name SEPARATOR ', ') AS roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r       ON ur.role_id = r.id
WHERE u.name LIKE ?            -- ej: '%carlos%'
GROUP BY u.id
ORDER BY u.name ASC;

-- -----------------------------------------------------------------------

-- 1.5  Buscar usuarios por email (dominio o alias)
SELECT id, name, email, document, status
FROM users
WHERE email LIKE ?             -- ej: '%@sena.edu.co'
ORDER BY email ASC;

-- -----------------------------------------------------------------------

-- 1.6  Usuarios con un rol específico
SELECT u.id, u.name, u.email, u.document, u.status
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r       ON ur.role_id = r.id
WHERE r.name = ?               -- ej: 'Estudiante' | 'Profesor' | 'SuperAdmin' | 'Auditor'
ORDER BY u.name ASC;

-- -----------------------------------------------------------------------

-- 1.7  Usuarios activos / inactivos
SELECT u.id, u.name, u.email, u.document, u.status,
       GROUP_CONCAT(r.name SEPARATOR ', ') AS roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r       ON ur.role_id = r.id
WHERE u.status = ?             -- 'activo' | 'inactivo'
GROUP BY u.id
ORDER BY u.name ASC;

-- -----------------------------------------------------------------------

-- 1.8  Usuarios sin ningún rol asignado (huérfanos)
SELECT u.id, u.name, u.email, u.document, u.status
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role_id IS NULL
ORDER BY u.createdAt DESC;

-- -----------------------------------------------------------------------

-- 1.9  Usuarios con múltiples roles simultáneos
SELECT u.id, u.name, u.email,
       COUNT(ur.role_id)                              AS total_roles,
       GROUP_CONCAT(r.name ORDER BY r.id SEPARATOR ', ') AS roles
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r       ON ur.role_id = r.id
GROUP BY u.id
HAVING total_roles > 1
ORDER BY total_roles DESC;

-- -----------------------------------------------------------------------

-- 1.10 Usuarios registrados en un rango de fechas
SELECT u.id, u.name, u.email, u.document, u.status, u.createdAt
FROM users u
WHERE u.createdAt BETWEEN ? AND ?   -- ej: '2025-01-01' AND '2025-12-31'
ORDER BY u.createdAt DESC;

-- -----------------------------------------------------------------------

-- 1.11 Buscar por nombre O por documento (búsqueda general tipo "buscador")
SELECT u.id, u.name, u.email, u.document, u.status,
       GROUP_CONCAT(r.name SEPARATOR ', ') AS roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r       ON ur.role_id = r.id
WHERE u.name LIKE ? OR u.document LIKE ?   -- ej: '%juan%', '%juan%' (mismo valor x2)
GROUP BY u.id
ORDER BY u.name ASC;

-- -----------------------------------------------------------------------

-- 1.12 Conteo de usuarios por rol
SELECT r.name AS rol, COUNT(ur.user_id) AS total_usuarios
FROM roles r
LEFT JOIN user_roles ur ON r.id = ur.role_id
GROUP BY r.id, r.name
ORDER BY total_usuarios DESC;

-- -----------------------------------------------------------------------

-- 1.13 Conteo de usuarios por estado
SELECT status, COUNT(*) AS total
FROM users
GROUP BY status;


-- ============================================================================
-- SECCIÓN 2 — TAREAS
-- ============================================================================

-- 2.1  Todas las tareas con sus asignados y estado por asignación
SELECT
    t.id          AS tarea_id,
    t.title,
    t.description,
    t.createdAt,
    u.id          AS estudiante_id,
    u.name        AS estudiante,
    ut.status,
    creator.name  AS creada_por
FROM tasks t
LEFT JOIN user_tasks ut ON t.id = ut.task_id
LEFT JOIN users u       ON ut.user_id = u.id
LEFT JOIN users creator ON t.created_by = creator.id
ORDER BY t.id DESC, u.name ASC;

-- -----------------------------------------------------------------------

-- 2.2  Buscar tareas por título (LIKE)
SELECT t.id, t.title, t.description, t.createdAt,
       COUNT(ut.user_id) AS asignados
FROM tasks t
LEFT JOIN user_tasks ut ON t.id = ut.task_id
WHERE t.title LIKE ?           -- ej: '%parcial%'
GROUP BY t.id
ORDER BY t.createdAt DESC;

-- -----------------------------------------------------------------------

-- 2.3  Buscar tareas por palabras en la descripción
SELECT t.id, t.title, t.description, t.createdAt
FROM tasks t
WHERE t.description LIKE ?     -- ej: '%HTML%'
ORDER BY t.createdAt DESC;

-- -----------------------------------------------------------------------

-- 2.4  Tareas con un estado específico (filtra en la pivote)
SELECT
    t.id, t.title,
    u.name AS estudiante,
    ut.status,
    ut.createdAt AS asignado_el
FROM user_tasks ut
JOIN tasks t ON ut.task_id = t.id
JOIN users u ON ut.user_id = u.id
WHERE ut.status = ?            -- 'pendiente' | 'en progreso' | 'completada' | 'incompleta'
ORDER BY t.id DESC;

-- -----------------------------------------------------------------------

-- 2.5  Tareas de un estudiante específico (por su ID)
SELECT
    t.id, t.title, t.description,
    ut.status,
    ut.createdAt AS asignado_el
FROM user_tasks ut
JOIN tasks t ON ut.task_id = t.id
WHERE ut.user_id = ?           -- ej: 5
ORDER BY t.id DESC;

-- -----------------------------------------------------------------------

-- 2.6  Tareas de un estudiante buscado por nombre
SELECT
    u.name AS estudiante,
    t.id   AS tarea_id,
    t.title,
    ut.status
FROM user_tasks ut
JOIN tasks t ON ut.task_id = t.id
JOIN users u ON ut.user_id = u.id
WHERE u.name LIKE ?            -- ej: '%maria%'
ORDER BY u.name, t.id DESC;

-- -----------------------------------------------------------------------

-- 2.7  Tareas creadas por un instructor específico
SELECT t.id, t.title, t.description, t.createdAt,
       COUNT(ut.user_id) AS total_asignados
FROM tasks t
LEFT JOIN user_tasks ut ON t.id = ut.task_id
WHERE t.created_by = ?         -- ej: 2
GROUP BY t.id
ORDER BY t.createdAt DESC;

-- -----------------------------------------------------------------------

-- 2.8  Tareas sin ningún asignado (creadas pero no asignadas)
SELECT t.id, t.title, t.description, t.createdAt
FROM tasks t
LEFT JOIN user_tasks ut ON t.id = ut.task_id
WHERE ut.task_id IS NULL
ORDER BY t.createdAt DESC;

-- -----------------------------------------------------------------------

-- 2.9  Tareas con más estudiantes asignados (ranking)
SELECT
    t.id, t.title,
    COUNT(ut.user_id)               AS total_asignados,
    SUM(ut.status = 'completada')   AS completadas,
    SUM(ut.status = 'pendiente')    AS pendientes,
    SUM(ut.status = 'en progreso')  AS en_progreso,
    SUM(ut.status = 'incompleta')   AS rechazadas
FROM tasks t
JOIN user_tasks ut ON t.id = ut.task_id
GROUP BY t.id
ORDER BY total_asignados DESC;

-- -----------------------------------------------------------------------

-- 2.10 Progreso global de UNA tarea específica
SELECT
    t.id, t.title,
    COUNT(ut.user_id)                              AS total_asignados,
    ROUND(SUM(ut.status = 'completada')
          / COUNT(ut.user_id) * 100, 1)            AS pct_completadas,
    SUM(ut.status = 'completada')                  AS completadas,
    SUM(ut.status = 'pendiente')                   AS pendientes,
    SUM(ut.status = 'en progreso')                 AS en_progreso,
    SUM(ut.status = 'incompleta')                  AS rechazadas
FROM tasks t
JOIN user_tasks ut ON t.id = ut.task_id
WHERE t.id = ?                 -- ej: 3
GROUP BY t.id;

-- -----------------------------------------------------------------------

-- 2.11 Tareas creadas en un rango de fechas
SELECT t.id, t.title, t.createdAt,
       creator.name AS creada_por,
       COUNT(ut.user_id) AS asignados
FROM tasks t
LEFT JOIN user_tasks ut ON t.id = ut.task_id
LEFT JOIN users creator ON t.created_by = creator.id
WHERE t.createdAt BETWEEN ? AND ?   -- ej: '2025-01-01' AND '2025-12-31'
GROUP BY t.id
ORDER BY t.createdAt DESC;


-- ============================================================================
-- SECCIÓN 3 — CALIFICACIONES (task_grades)
-- ============================================================================

-- 3.1  Todas las calificaciones con datos completos
SELECT
    t.title        AS tarea,
    u.name         AS estudiante,
    u.document,
    tg.grade       AS nota,
    CASE WHEN tg.grade >= 75 THEN 'APROBÓ' ELSE 'NO APROBÓ' END AS resultado,
    grader.name    AS calificado_por,
    tg.updatedAt   AS fecha_calificacion
FROM task_grades tg
JOIN tasks t      ON tg.task_id    = t.id
JOIN users u      ON tg.student_id = u.id
LEFT JOIN users grader ON tg.graded_by = grader.id
ORDER BY tg.updatedAt DESC;

-- -----------------------------------------------------------------------

-- 3.2  Calificaciones de UN estudiante (por ID)
SELECT
    t.title,
    tg.grade,
    CASE WHEN tg.grade >= 75 THEN 'APROBÓ' ELSE 'NO APROBÓ' END AS resultado,
    grader.name  AS calificado_por,
    tg.updatedAt
FROM task_grades tg
JOIN tasks t        ON tg.task_id    = t.id
LEFT JOIN users grader ON tg.graded_by = grader.id
WHERE tg.student_id = ?        -- ej: 5
ORDER BY tg.updatedAt DESC;

-- -----------------------------------------------------------------------

-- 3.3  Calificaciones de una tarea específica
SELECT
    u.name     AS estudiante,
    u.document,
    tg.grade,
    CASE WHEN tg.grade >= 75 THEN 'APROBÓ' ELSE 'NO APROBÓ' END AS resultado
FROM task_grades tg
JOIN users u ON tg.student_id = u.id
WHERE tg.task_id = ?           -- ej: 3
ORDER BY tg.grade DESC;

-- -----------------------------------------------------------------------

-- 3.4  Promedio de notas por tarea
SELECT
    t.id, t.title,
    COUNT(tg.student_id)         AS calificados,
    ROUND(AVG(tg.grade), 1)      AS promedio,
    MIN(tg.grade)                AS nota_minima,
    MAX(tg.grade)                AS nota_maxima,
    SUM(tg.grade >= 75)          AS aprobados,
    SUM(tg.grade < 75)           AS reprobados
FROM tasks t
JOIN task_grades tg ON t.id = tg.task_id
GROUP BY t.id
ORDER BY promedio DESC;

-- -----------------------------------------------------------------------

-- 3.5  Estudiantes que reprobaron (nota < 75) — para seguimiento
SELECT
    u.name, u.email, u.document,
    t.title     AS tarea,
    tg.grade    AS nota,
    tg.updatedAt
FROM task_grades tg
JOIN users u  ON tg.student_id = u.id
JOIN tasks t  ON tg.task_id    = t.id
WHERE tg.grade < 75
ORDER BY tg.grade ASC;

-- -----------------------------------------------------------------------

-- 3.6  Promedio general por estudiante (ranking de rendimiento)
SELECT
    u.id, u.name, u.document,
    COUNT(tg.task_id)       AS tareas_calificadas,
    ROUND(AVG(tg.grade), 1) AS promedio_general,
    SUM(tg.grade >= 75)     AS aprobadas,
    SUM(tg.grade < 75)      AS reprobadas
FROM task_grades tg
JOIN users u ON tg.student_id = u.id
GROUP BY u.id
ORDER BY promedio_general DESC;

-- -----------------------------------------------------------------------

-- 3.7  Tareas sin calificar de un estudiante (asignadas pero sin nota)
SELECT
    t.id, t.title,
    ut.status,
    ut.createdAt AS asignado_el
FROM user_tasks ut
JOIN tasks t ON ut.task_id = t.id
LEFT JOIN task_grades tg
    ON tg.task_id = ut.task_id AND tg.student_id = ut.user_id
WHERE ut.user_id = ?           -- ej: 5
  AND tg.task_id IS NULL
ORDER BY t.id DESC;


-- ============================================================================
-- SECCIÓN 4 — COMENTARIOS (task_comments)
-- ============================================================================

-- 4.1  Todos los comentarios de una tarea para un estudiante
SELECT
    tc.id,
    tc.message,
    tc.createdAt,
    author.name   AS autor,
    GROUP_CONCAT(r.name ORDER BY r.id SEPARATOR ', ') AS roles_autor
FROM task_comments tc
JOIN users author ON tc.author_id = author.id
LEFT JOIN user_roles ur ON author.id = ur.user_id
LEFT JOIN roles r       ON ur.role_id = r.id
WHERE tc.task_id = ?           -- ej: 3
  AND tc.student_id = ?        -- ej: 5
GROUP BY tc.id
ORDER BY tc.createdAt ASC;

-- -----------------------------------------------------------------------

-- 4.2  Hilos activos: tareas con al menos un comentario
SELECT
    t.id    AS tarea_id,
    t.title,
    u.name  AS estudiante,
    COUNT(tc.id)           AS total_mensajes,
    MAX(tc.createdAt)      AS ultimo_mensaje
FROM task_comments tc
JOIN tasks t ON tc.task_id    = t.id
JOIN users u ON tc.student_id = u.id
GROUP BY tc.task_id, tc.student_id
ORDER BY ultimo_mensaje DESC;

-- -----------------------------------------------------------------------

-- 4.3  Hilos sin respuesta del instructor (solo tiene mensajes del estudiante)
SELECT
    t.id    AS tarea_id,
    t.title,
    u.name  AS estudiante,
    COUNT(tc.id) AS mensajes_del_estudiante,
    MAX(tc.createdAt) AS ultimo_mensaje
FROM task_comments tc
JOIN tasks t ON tc.task_id    = t.id
JOIN users u ON tc.student_id = u.id
WHERE tc.author_id = tc.student_id   -- el autor ES el estudiante (sin respuesta)
GROUP BY tc.task_id, tc.student_id
ORDER BY ultimo_mensaje ASC;         -- los más viejos sin respuesta primero

-- -----------------------------------------------------------------------

-- 4.4  Últimos N comentarios del sistema (feed global para el instructor)
SELECT
    tc.message,
    tc.createdAt,
    author.name  AS autor,
    stud.name    AS estudiante,
    t.title      AS tarea
FROM task_comments tc
JOIN users author ON tc.author_id  = author.id
JOIN users stud   ON tc.student_id = stud.id
JOIN tasks t      ON tc.task_id    = t.id
ORDER BY tc.createdAt DESC
LIMIT ?;                             -- ej: 20


-- ============================================================================
-- SECCIÓN 5 — AUDITORÍA (audit_logs)
-- ============================================================================

-- 5.1  Todos los logs ordenados por fecha
SELECT
    al.id,
    al.action,
    al.reason,
    al.target_user_name,
    al.target_user_id,
    u.name  AS ejecutado_por,
    al.createdAt
FROM audit_logs al
LEFT JOIN users u ON al.performed_by = u.id
ORDER BY al.createdAt DESC;

-- -----------------------------------------------------------------------

-- 5.2  Logs de un administrador específico
SELECT al.id, al.action, al.reason, al.target_user_name, al.createdAt
FROM audit_logs al
WHERE al.performed_by = ?      -- ej: 1
ORDER BY al.createdAt DESC;

-- -----------------------------------------------------------------------

-- 5.3  Logs buscando por nombre del usuario eliminado
SELECT al.id, al.action, al.reason, al.target_user_name, al.createdAt,
       u.name AS ejecutado_por
FROM audit_logs al
LEFT JOIN users u ON al.performed_by = u.id
WHERE al.target_user_name LIKE ?   -- ej: '%garcia%'
ORDER BY al.createdAt DESC;

-- -----------------------------------------------------------------------

-- 5.4  Logs en un rango de fechas
SELECT al.id, al.action, al.target_user_name, al.reason, al.createdAt,
       u.name AS ejecutado_por
FROM audit_logs al
LEFT JOIN users u ON al.performed_by = u.id
WHERE al.createdAt BETWEEN ? AND ?   -- ej: '2025-01-01' AND '2025-12-31'
ORDER BY al.createdAt DESC;

-- -----------------------------------------------------------------------

-- 5.5  Conteo de acciones por administrador (quién eliminó más)
SELECT
    u.name      AS administrador,
    COUNT(al.id) AS total_eliminaciones
FROM audit_logs al
JOIN users u ON al.performed_by = u.id
GROUP BY al.performed_by
ORDER BY total_eliminaciones DESC;


-- ============================================================================
-- SECCIÓN 6 — RBAC (roles y permisos)
-- ============================================================================

-- 6.1  Todos los roles con sus permisos
SELECT
    r.id    AS rol_id,
    r.name  AS rol,
    r.description,
    GROUP_CONCAT(p.name ORDER BY p.id SEPARATOR ', ') AS permisos
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p       ON rp.permission_id = p.id
GROUP BY r.id
ORDER BY r.id ASC;

-- -----------------------------------------------------------------------

-- 6.2  Permisos de un rol específico
SELECT p.id, p.name, p.description
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
WHERE rp.role_id = ?           -- ej: 2 (Profesor)
ORDER BY p.id ASC;

-- -----------------------------------------------------------------------

-- 6.3  Permisos efectivos de un usuario (unión de todos sus roles)
SELECT DISTINCT p.id, p.name, p.description
FROM users u
JOIN user_roles ur      ON u.id  = ur.user_id
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p       ON rp.permission_id = p.id
WHERE u.id = ?                 -- ej: 3
ORDER BY p.id ASC;

-- -----------------------------------------------------------------------

-- 6.4  Roles que tienen un permiso específico
SELECT r.id, r.name, r.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p       ON rp.permission_id = p.id
WHERE p.name = ?               -- ej: 'tasks.create.multiple'
ORDER BY r.id ASC;

-- -----------------------------------------------------------------------

-- 6.5  Roles personalizados (los que NO son los 4 base del sistema)
SELECT id, name, description
FROM roles
WHERE id > 4                   -- los 4 base tienen id 1-4
ORDER BY id ASC;


-- ============================================================================
-- SECCIÓN 7 — CONSULTAS DE DIAGNÓSTICO Y SALUD DEL SISTEMA
-- ============================================================================

-- 7.1  Resumen general del sistema (una sola consulta tipo dashboard)
SELECT
    (SELECT COUNT(*) FROM users)                                AS total_usuarios,
    (SELECT COUNT(*) FROM users WHERE status = 'activo')        AS usuarios_activos,
    (SELECT COUNT(*) FROM users WHERE status = 'inactivo')      AS usuarios_inactivos,
    (SELECT COUNT(*) FROM tasks)                                AS total_tareas,
    (SELECT COUNT(*) FROM user_tasks)                           AS total_asignaciones,
    (SELECT COUNT(*) FROM user_tasks WHERE status = 'pendiente')   AS pendientes,
    (SELECT COUNT(*) FROM user_tasks WHERE status = 'en progreso') AS en_progreso,
    (SELECT COUNT(*) FROM user_tasks WHERE status = 'completada')  AS completadas,
    (SELECT COUNT(*) FROM user_tasks WHERE status = 'incompleta')  AS rechazadas,
    (SELECT COUNT(*) FROM task_grades)                          AS calificaciones_emitidas,
    (SELECT COUNT(*) FROM task_comments)                        AS total_comentarios,
    (SELECT COUNT(*) FROM audit_logs)                           AS total_eliminaciones,
    (SELECT COUNT(*) FROM roles)                                AS total_roles;

-- -----------------------------------------------------------------------

-- 7.2  Estudiantes con tareas pero sin ninguna completada
SELECT
    u.id, u.name, u.email,
    COUNT(ut.task_id)                    AS total_asignadas,
    SUM(ut.status = 'completada')        AS completadas,
    SUM(ut.status = 'pendiente')         AS pendientes,
    SUM(ut.status = 'en progreso')       AS en_progreso
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r       ON ur.role_id = r.id AND r.name = 'Estudiante'
LEFT JOIN user_tasks ut ON u.id = ut.user_id
GROUP BY u.id
HAVING completadas = 0 AND total_asignadas > 0
ORDER BY total_asignadas DESC;

-- -----------------------------------------------------------------------

-- 7.3  Tareas completadas sin calificación (el instructor olvidó calificar)
SELECT
    t.id, t.title,
    u.name     AS estudiante,
    u.document,
    ut.createdAt AS fecha_asignacion
FROM user_tasks ut
JOIN tasks t ON ut.task_id = t.id
JOIN users u ON ut.user_id = u.id
LEFT JOIN task_grades tg
    ON tg.task_id = ut.task_id AND tg.student_id = ut.user_id
WHERE ut.status = 'completada'
  AND tg.task_id IS NULL
ORDER BY ut.createdAt ASC;

-- -----------------------------------------------------------------------

-- 7.4  Verificar integridad: user_tasks sin tarea o usuario válido
SELECT ut.task_id, ut.user_id, ut.status
FROM user_tasks ut
LEFT JOIN tasks t ON ut.task_id = t.id
LEFT JOIN users u ON ut.user_id = u.id
WHERE t.id IS NULL OR u.id IS NULL;
-- Si esta consulta devuelve filas hay un problema de integridad referencial.

-- ============================================================================
-- FIN DEL ARCHIVO
-- ============================================================================