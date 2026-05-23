-- ============================================================================
-- TaskApp SENA — Script de Base de Datos DEFINITIVO
-- Versión: v4 — Fix integridad referencial en task_comments.author_id
--
-- CAMBIOS RESPECTO A v3:
--   ✅ task_comments.author_id → INT NULL + ON DELETE SET NULL
--      Antes: ON DELETE CASCADE (borraba comentarios al eliminar al instructor)
--      Ahora: ON DELETE SET NULL (conserva el historial del hilo)
-- ============================================================================

CREATE USER IF NOT EXISTS 'nano'@'localhost' IDENTIFIED BY 'admin123';
CREATE DATABASE IF NOT EXISTS taskAppDb;
GRANT ALL PRIVILEGES ON taskAppDb.* TO 'nano'@'localhost';
FLUSH PRIVILEGES;

-- ============================================================================
-- 1. DESTRUCCIÓN Y RECREACIÓN LIMPIA
-- ============================================================================
DROP DATABASE IF EXISTS taskAppDb;
CREATE DATABASE taskAppDb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taskAppDb;

-- ============================================================================
-- 2. RBAC — roles, permissions, role_permissions
-- ============================================================================

CREATE TABLE roles (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE permissions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE role_permissions (
    role_id       INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- ============================================================================
-- 3. USUARIOS
-- Sin role_id — los roles viven en la tabla pivote user_roles.
-- ============================================================================

CREATE TABLE users (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    document       VARCHAR(50)  NOT NULL UNIQUE,
    password       VARCHAR(255) NOT NULL,
    status         ENUM('activo', 'inactivo') DEFAULT 'activo',
    otp_code       VARCHAR(6)   NULL,
    otp_expires_at DATETIME     NULL,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. TABLA PIVOTE user_roles (usuarios ↔ roles, muchos a muchos)
--
-- Un usuario puede tener múltiples roles simultáneamente.
-- Sus permisos = UNIÓN de todos los permisos de todos sus roles.
-- ============================================================================

CREATE TABLE user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- ============================================================================
-- 5. TAREAS
-- created_by: guarda qué usuario (instructor/superadmin) creó la tarea.
-- SET NULL si el creador es eliminado del sistema.
-- ============================================================================

CREATE TABLE tasks (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    created_by  INT NULL,
    createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- 6. TABLA PIVOTE user_tasks (tareas ↔ usuarios, muchos a muchos)
--
-- Cada fila = una tarea asignada a un usuario con su propio estado.
-- Una misma tarea puede tener múltiples estudiantes asignados,
-- cada uno con su estado independiente.
-- ============================================================================

CREATE TABLE user_tasks (
    task_id   INT NOT NULL,
    user_id   INT NOT NULL,
    status    ENUM('pendiente', 'en progreso', 'completada', 'incompleta')
              NOT NULL DEFAULT 'pendiente',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- 7. AUDITORÍA
-- Registra las eliminaciones definitivas de usuarios (hard delete).
-- performed_by → SET NULL si el admin que ejecutó la acción es eliminado.
-- ============================================================================

CREATE TABLE audit_logs (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    action           VARCHAR(50)  NOT NULL,
    reason           TEXT         NOT NULL,
    target_user_id   INT,
    target_user_name VARCHAR(255),
    performed_by     INT,
    createdAt        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- 8. COMENTARIOS DE TAREA
--
-- Chat entre estudiante ↔ instructor/superadmin dentro de cada tarea.
-- Hilo identificado por (task_id, student_id).
--
-- author_id  → NULL si el autor es eliminado del sistema (SET NULL).
--              Así el historial del hilo se conserva intacto.
--              En el frontend mostrar "Usuario eliminado" cuando sea NULL.
--
-- student_id → CASCADE: si el estudiante es eliminado, sus hilos se borran
--              junto con él porque no tiene sentido conservarlos.
-- ============================================================================

CREATE TABLE task_comments (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    task_id    INT  NOT NULL,
    student_id INT  NOT NULL,
    author_id  INT  NULL,                  -- ← NULL cuando el autor fue eliminado
    message    TEXT NOT NULL,
    createdAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id)    REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id)  REFERENCES users(id) ON DELETE SET NULL,  -- ← SET NULL (fix v4)
    INDEX idx_task_student (task_id, student_id)
);

-- ============================================================================
-- 9. CALIFICACIONES DE TAREA
--
-- Sistema SENA: >= 75 aprueba, < 75 no aprueba.
-- Una calificación por (task_id, student_id). Si se recalifica se actualiza.
-- graded_by → SET NULL si el calificador es eliminado del sistema.
-- ============================================================================

CREATE TABLE task_grades (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    task_id    INT              NOT NULL,
    student_id INT              NOT NULL,
    grade      TINYINT UNSIGNED NOT NULL,
    graded_by  INT              NULL,
    createdAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_grade CHECK (grade <= 100),
    UNIQUE KEY uq_task_student (task_id, student_id),
    FOREIGN KEY (task_id)    REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by)  REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- 10. ROLES BASE DEL SISTEMA
-- ============================================================================

INSERT INTO roles (name, description) VALUES
('SuperAdmin', 'Control total del sistema'),
('Profesor',   'Gestor de tareas y estudiantes'),
('Estudiante', 'Acceso solo a sus propias tareas'),
('Auditor',    'Lectura global y auditoría del sistema');

-- ============================================================================
-- 11. PERMISOS DEL SISTEMA
-- ============================================================================

INSERT INTO permissions (name, description) VALUES
('system.manage.all',       'Gestión total del sistema'),           -- id 1
('users.create',            'Crear usuarios'),                      -- id 2
('users.read.all',          'Leer todos los usuarios'),             -- id 3
('users.update.status',     'Cambiar estado de usuarios'),          -- id 4
('tasks.create.multiple',   'Crear tareas masivas'),                -- id 5
('tasks.read.all',          'Ver todas las tareas'),                -- id 6
('tasks.update.all',        'Editar cualquier tarea'),              -- id 7
('tasks.delete.all',        'Eliminar cualquier tarea'),            -- id 8
('tasks.read.own',          'Ver tareas propias'),                  -- id 9
('tasks.update.status.own', 'Gestionar estado de tareas propias'),  -- id 10
('system.audit',            'Auditoría del sistema');               -- id 11

-- ============================================================================
-- 12. ASIGNACIÓN DE PERMISOS POR ROL
-- ============================================================================

-- SuperAdmin (id=1): todos los permisos sin excepción
INSERT INTO role_permissions (role_id, permission_id)
    SELECT 1, id FROM permissions;

-- Profesor (id=2): gestión de usuarios + gestión completa de tareas
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (2, 2),   -- users.create
    (2, 3),   -- users.read.all
    (2, 4),   -- users.update.status
    (2, 5),   -- tasks.create.multiple
    (2, 6),   -- tasks.read.all
    (2, 7),   -- tasks.update.all
    (2, 8);   -- tasks.delete.all

-- Estudiante (id=3): solo sus propias tareas
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (3, 9),   -- tasks.read.own
    (3, 10);  -- tasks.update.status.own

-- Auditor (id=4): lectura global + auditoría (sin poder crear ni modificar)
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (4, 3),   -- users.read.all
    (4, 6),   -- tasks.read.all
    (4, 11);  -- system.audit

-- ============================================================================
-- FIN DEL SCRIPT v4
--
-- La tabla users queda vacía intencionalmente.
-- El primer usuario que se registre recibe automáticamente el rol SuperAdmin
-- mediante un INSERT en user_roles desde auth.controller.js.
--
-- TABLAS CREADAS:
--   roles, permissions, role_permissions   → RBAC
--   users, user_roles                      → Usuarios multi-rol
--   tasks, user_tasks                      → Tareas y asignaciones
--   audit_logs                             → Auditoría de eliminaciones
--   task_comments                          → Chat tarea+estudiante  (v4: author_id NULL)
--   task_grades                            → Calificaciones SENA
--
-- POLÍTICA DE BORRADO REFERENCIAL:
--   ON DELETE CASCADE  → el registro hijo no tiene sentido sin el padre
--   ON DELETE SET NULL → el registro hijo debe conservarse (historial/auditoría)
-- ============================================================================