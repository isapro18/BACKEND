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
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE role_permissions (
    role_id INT,
    permission_id INT,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    document VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    status ENUM('activo', 'inactivo') DEFAULT 'activo',
    role_id INT NOT NULL,
    otp_code VARCHAR(6) NULL,
    otp_expires_at DATETIME NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('pendiente', 'en progreso', 'completada', 'incompleta') NOT NULL DEFAULT 'pendiente',
    userId INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    target_user_id INT, 
    target_user_name VARCHAR(255),
    performed_by INT, 
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. POBLACIÓN DE ROLES Y PERMISOS
INSERT INTO roles (name, description) VALUES
('SuperAdmin', 'Control total'), 
('Profesor', 'Gestor de tareas'), 
('Estudiante', 'Colaborador base'), 
('Auditor', 'Invitado lectura');

INSERT INTO permissions (name, description) VALUES
('system.manage.all', 'Gestión total'), 
('users.create', 'Crear usuarios'), 
('users.read.all', 'Leer usuarios'),
('users.update.status', 'Estado usuarios'), 
('tasks.create.multiple', 'Tareas masivas'), 
('tasks.read.all', 'Ver todo'),
('tasks.update.all', 'Editar todo'), 
('tasks.delete.all', 'Borrar todo'), 
('tasks.read.own', 'Ver propias'),
('tasks.update.status.own', 'Gestionar propias'),
('system.audit', 'Auditoría del sistema');

-- Asignación de Permisos
-- SuperAdmin (Todos los permisos)
INSERT INTO role_permissions (role_id, permission_id) SELECT 1, id FROM permissions;
-- Profesor
INSERT INTO role_permissions (role_id, permission_id) VALUES (2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 8);
-- Estudiante
INSERT INTO role_permissions (role_id, permission_id) VALUES (3, 9), (3, 10);
-- Auditor
INSERT INTO role_permissions (role_id, permission_id) VALUES (4, 3), (4, 6), (4, 11);

-- Nota: La tabla `users` está deliberadamente vacía para el auto-registro del SuperAdmin.