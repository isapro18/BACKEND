-- ============================================================================
-- TaskApp SENA — Seed de Usuarios y Roles
-- ============================================================================
-- CONTRASEÑAS EN TEXTO PLANO (solo para referencia, NO van a la DB):
--
--   Andres Calvete   →  Mariana222
--   Usuarios 2 al 6  →  Password123
--
-- DISTRIBUCIÓN DE ROLES:
--   id=1  Andres Calvete    → SuperAdmin
--   id=2  Laura Méndez      → Estudiante
--   id=3  Carlos Ríos       → Estudiante
--   id=4  Valentina Gómez   → Auditor
--   id=5  Diego Herrera     → Instructor
--   id=6  Sofía Vargas      → Instructor + Estudiante
--   id=7  Mateo Castillo    → SuperAdmin + Profesor + Estudiante + Auditor
-- ============================================================================

USE taskAppDb;

-- ============================================================================
-- 1. USUARIOS
-- ============================================================================

INSERT INTO users (id, name, email, document, password, status) VALUES
(1, 'Andres Calvete',  'santi@gmail.com',     '1097789129', '$2b$10$QiPJZ4tYdHR6.JBaVC6xgeYxUWIGXUhlogyt3w7SN8x6Nq3rAKmTG', 'activo'),
(2, 'Laura Méndez',    'laura@gmail.com',     '1097789130', '$2b$10$p0ezhJrCiDtfz0EivRat0eRHy5SYk6vGEgHmsael9iNWG1BuVwala', 'activo'),
(3, 'Carlos Ríos',     'carlos@gmail.com',    '1097789131', '$2b$10$iRZnfAftnJpiCJbJFTYEEuaCf9Jnoy1zTnnWcRgWBZGA9jrEycTEa', 'activo'),
(4, 'Valentina Gómez', 'valentina@gmail.com', '1097789132', '$2b$10$z4CyNlavp4WVZCGIlOu71eJVCiLKfd/PSzz8LeLgTgGMcPFDGAVkW', 'activo'),
(5, 'Diego Herrera',   'diego@gmail.com',     '1097789133', '$2b$10$aqR3BRJKs6pCM5k1oputre3Kf081gI8oS33l6qdnQ/ZjSYaA6ST/m', 'activo'),
(6, 'Sofía Vargas',    'sofia@gmail.com',     '1097789134', '$2b$10$ghqk50k1cTJraWdeltWfu..RrtRVNZ7PzLR.nqJMfEf2w86lGIcyi', 'activo'),
(7, 'Mateo Castillo',  'mateo@gmail.com',     '1097789135', '$2b$10$p0ezhJrCiDtfz0EivRat0eRHy5SYk6vGEgHmsael9iNWG1BuVwala', 'activo');

-- ============================================================================
-- 2. ASIGNACIÓN DE ROLES
--
-- Roles base del sistema:
--   id=1 SuperAdmin  |  id=2 Profesor  |  id=3 Estudiante  |  id=4 Auditor
-- ============================================================================

INSERT INTO user_roles (user_id, role_id) VALUES

-- Andres Calvete → SuperAdmin
(1, 1),

-- Laura Méndez → Estudiante
(2, 3),

-- Carlos Ríos → Estudiante
(3, 3),

-- Valentina Gómez → Auditor
(4, 4),

-- Diego Herrera → Instructor (Profesor)
(5, 2),

-- Sofía Vargas → Instructor + Estudiante
(6, 2),
(6, 3),

-- Mateo Castillo → Todos los roles
(7, 1),
(7, 2),
(7, 3),
(7, 4);

-- ============================================================================
-- VERIFICACIÓN (ejecuta esto para confirmar que quedó bien)
-- ============================================================================
/*
SELECT
    u.id,
    u.name,
    u.email,
    u.document,
    u.status,
    GROUP_CONCAT(r.name ORDER BY r.id SEPARATOR ' + ') AS roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r       ON ur.role_id = r.id
GROUP BY u.id
ORDER BY u.id;
*/

/* Password123 */