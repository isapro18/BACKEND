import pool from '../config/db.js';

// 1. Obtener todas las tareas
export const getTasks = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tasks');
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ msn: "Error al obtener tareas" });
  }
};

// 2. Obtener tarea por ID
export const getTaskById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ msn: "Tarea no encontrada" });
    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ msn: "Error al obtener la tarea" });
  }
};

export const createTask = async (req, res) => {
  const { title, description, userIds } = req.body; 
  
  try {
    // Si mandaron un arreglo con varios estudiantes (ej: [1, 3, 6, 8])
    if (userIds && userIds.length > 0) {
      
      // Armamos un arreglo múltiple para MySQL
      const values = userIds.map(id => [title, description, 'pendiente', id]);
      
      // Insertamos todas las copias de un solo golpe (Multi-Insert)
      const [result] = await pool.query(
        'INSERT INTO tasks (title, description, status, userId) VALUES ?',
        [values]
      );
      
      return res.status(201).json({ 
        msn: `Tarea clonada y asignada a ${userIds.length} estudiantes exitosamente`,
        tareasCreadas: result.affectedRows 
      });
      
    } else {
      // Si mandaron el arreglo vacío, creamos una tarea "huérfana" (sin asignar)
      const [result] = await pool.query(
        'INSERT INTO tasks (title, description, status, userId) VALUES (?, ?, ?, NULL)',
        [title, description, 'pendiente']
      );
      
      return res.status(201).json({ msn: "Tarea creada sin asignar", id: result.insertId });
    }
  } catch (error) { 
    console.error(error);
    res.status(500).json({ msn: "Error al crear la tarea masiva" }); 
  }
};

// 4. Actualizar tarea completa
export const updateTask = async (req, res) => {
  const { title, description } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE tasks SET title = ?, description = ? WHERE id = ?',
      [title, description, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ msn: "Tarea no encontrada" });
    res.status(200).json({ msn: "Tarea actualizada" });
  } catch (error) {
    res.status(500).json({ msn: "Error al actualizar" });
  }
};

// 5. Eliminar tarea
export const deleteTask = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ msn: "Tarea no encontrada" });
    res.status(200).json({ msn: "Tarea eliminada" });
  } catch (error) {
    res.status(500).json({ msn: "Error al eliminar" });
  }
};

// 6. Cambiar estado de la tarea (patchTaskStatus)
export const patchTaskStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const [result] = await pool.query('UPDATE tasks SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ msn: "Tarea no encontrada" });
    res.status(200).json({ msn: "Estado actualizado" });
  } catch (error) {
    res.status(500).json({ msn: "Error al actualizar estado" });
  }
};

// 7. Dashboard Global
export const getDashboard = async (req, res) => {
  try {
    const [users] = await pool.query("SELECT * FROM users WHERE role = 'user' AND status = 'activo'");
    const [tasks] = await pool.query('SELECT * FROM tasks');

    const resumen = {
      estadisticas: {
        totalEstudiantes: users.length,
        totalTareas: tasks.length,
        pendientes: tasks.filter(t => t.status === 'pendiente').length,
        enProgreso: tasks.filter(t => t.status === 'en progreso').length,
        completadas: tasks.filter(t => t.status === 'completada').length
      },
      usuarios: users,
      tareasGlobales: tasks
    };
    res.status(200).json(resumen);
  } catch (error) {
    res.status(500).json({ msn: "Error al cargar dashboard" });
  }
};

// 8. Filtrar tareas (filterTasks)
export const filterTasks = async (req, res) => {
  const { status } = req.query;
  try {
    let query = 'SELECT * FROM tasks';
    const params = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    const [rows] = await pool.query(query, params);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ msn: "Error al filtrar" });
  }
};

// 9. Asignar usuarios a tarea (assignTaskToUsers)
export const assignTaskToUsers = async (req, res) => {
  const { userIds } = req.body;
  const taskId = req.params.taskId;
  try {
    if (userIds && userIds.length > 0) {
      await pool.query('UPDATE tasks SET userId = ? WHERE id = ?', [userIds[0], taskId]);
    }
    res.status(200).json({ msn: "Usuario asignado a la tarea" });
  } catch (error) {
    res.status(500).json({ msn: "Error al asignar" });
  }
};

// 10. Obtener usuarios de una tarea (getTaskUsers)
export const getTaskUsers = async (req, res) => {
  try {
    const [task] = await pool.query('SELECT userId FROM tasks WHERE id = ?', [req.params.taskId]);
    if (task.length === 0 || !task[0].userId) {
      return res.status(200).json([]);
    }
    const [user] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [task[0].userId]);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ msn: "Error al obtener usuarios de la tarea" });
  }
};

// 11. Remover usuario de la tarea (removeUserFromTask)
export const removeUserFromTask = async (req, res) => {
  try {
    await pool.query('UPDATE tasks SET userId = NULL WHERE id = ? AND userId = ?', [req.params.taskId, req.params.userId]);
    res.status(200).json({ msn: "Usuario removido de la tarea" });
  } catch (error) {
    res.status(500).json({ msn: "Error al remover" });
  }
};

// 12. Tareas por usuario (La ruta de Fer)
export const getTasksByUser = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE userId = ?', [req.params.userId]);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ msn: "Error al obtener las tareas del usuario" });
  }
};