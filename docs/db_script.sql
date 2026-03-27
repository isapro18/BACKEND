-- Creación de la base de datos
CREATE DATABASE IF NOT EXISTS taskAppDb;
USE taskAppDb;

-- Creación de la tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  document VARCHAR(20) UNIQUE NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  status ENUM('activo', 'inactivo') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserción del usuario Administrador por defecto
INSERT INTO users (name, email, document, role, status) 
VALUES ('Santiago Calvete', 'santiagocalvete69@gmail.com', '1097789129', 'admin', 'activo');