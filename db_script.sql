CREATE USER IF NOT EXISTS 'nano'@'localhost' IDENTIFIED BY 'admin123';

CREATE DATABASE IF NOT EXISTS taskAppDb;

GRANT ALL PRIVILEGES ON taskAppDb.* TO 'nano'@'localhost';
FLUSH PRIVILEGES;

USE taskAppDb;

-- 1. DESTRUCCIÓN Y RECREACIÓN LIMPIA
DROP DATABASE IF EXISTS taskAppDb;
CREATE DATABASE taskAppDb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taskAppDb;

-- 2. ESTRUCTURA RBAC
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
    role_id       INT,
    permission_id INT,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 3. USUARIOS
CREATE TABLE users (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    document       VARCHAR(50)  NOT NULL UNIQUE,
    password       VARCHAR(255) NOT NULL,
    status         ENUM('activo', 'inactivo') DEFAULT 'activo',
    role_id        INT NOT NULL,
    otp_code       VARCHAR(6)  NULL,
    otp_expires_at DATETIME    NULL,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 4. TAREAS
-- La tabla tasks ya NO tiene userId ni status propios.
-- El estado de cada asignación vive en la tabla pivote user_tasks,
-- porque dos estudiantes pueden tener la misma tarea en estados distintos.
CREATE TABLE tasks (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA PIVOTE user_tasks (RELACIÓN MUCHOS A MUCHOS)
-- Cada fila representa la asignación de UNA tarea a UN usuario,
-- con su propio estado de progreso independiente.
--
-- Ejemplo:
--   task_id=1, user_id=3, status='pendiente'   → Juan no ha empezado
--   task_id=1, user_id=4, status='completada'  → María ya terminó
--   (misma tarea, estados distintos por estudiante)
CREATE TABLE user_tasks (
    task_id   INT NOT NULL,
    user_id   INT NOT NULL,
    status    ENUM('pendiente', 'en progreso', 'completada', 'incompleta') NOT NULL DEFAULT 'pendiente',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. AUDITORÍA
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

-- 7. POBLACIÓN DE ROLES Y PERMISOS
INSERT INTO roles (name, description) VALUES
('SuperAdmin', 'Control total'),
('Profesor',   'Gestor de tareas'),
('Estudiante', 'Colaborador base'),
('Auditor',    'Invitado lectura');

INSERT INTO permissions (name, description) VALUES
('system.manage.all',       'Gestión total'),
('users.create',            'Crear usuarios'),
('users.read.all',          'Leer usuarios'),
('users.update.status',     'Estado usuarios'),
('tasks.create.multiple',   'Tareas masivas'),
('tasks.read.all',          'Ver todo'),
('tasks.update.all',        'Editar todo'),
('tasks.delete.all',        'Borrar todo'),
('tasks.read.own',          'Ver propias'),
('tasks.update.status.own', 'Gestionar propias'),
('system.audit',            'Auditoría del sistema');

-- Asignación de permisos por rol
-- SuperAdmin: todos los permisos
INSERT INTO role_permissions (role_id, permission_id) SELECT 1, id FROM permissions;
-- Profesor: crear, leer, editar y borrar tareas + leer/gestionar usuarios
INSERT INTO role_permissions (role_id, permission_id) VALUES (2,2),(2,3),(2,4),(2,5),(2,6),(2,7),(2,8);
-- Estudiante: solo sus propias tareas
INSERT INTO role_permissions (role_id, permission_id) VALUES (3,9),(3,10);
-- Auditor: lectura global + auditoría
INSERT INTO role_permissions (role_id, permission_id) VALUES (4,3),(4,6),(4,11);

-- La tabla users está vacía intencionalmente.
-- El primer usuario en registrarse recibe automáticamente el rol SuperAdmin.