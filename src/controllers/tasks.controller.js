const DB_URL = 'http://localhost:4000/tasks';
const USERS_DB_URL = 'http://localhost:4000/users';

const getTasks = async (req, res) => {
  try {
    const response = await fetch(DB_URL);
    res.status(200).json(await response.json());
  } catch (error) {
    res.status(500).json({ msn: "Error al obtener tareas" });
  }
};

const getTaskById = async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/${req.params.id}`);
    if (!response.ok) return res.status(404).json({ msn: "Tarea no encontrada" });
    res.status(200).json(await response.json());
  } catch (error) {
    res.status(500).json({ msn: "Error al obtener la tarea" });
  }
};

const createTask = async (req, res) => {
  const { title, body, userIds } = req.body; 
  
  const newTask = {
    title,
    body,
    userIds: userIds || [], // Array de IDs
    status: "pendiente"
  };

  try {
    const response = await fetch(DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask)
    });
    res.status(201).json({ msn: "Tarea creada", data: await response.json() });
  } catch (error) {
    res.status(500).json({ msn: "Error al crear tarea" });
  }
};

const updateTask = async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/${req.params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    if (!response.ok) {
      return res.status(404).json({ msn: "La tarea no existe" });
    }
    res.status(200).json({ msn: "Tarea actualizada", data: await response.json() });
  } catch (error) {
    res.status(500).json({ msn: "Error al actualizar tarea" });
  }
};

const deleteTask = async (req, res) => {
  try {
    await fetch(`${DB_URL}/${req.params.id}`, { method: 'DELETE' });
    res.status(200).json({ msn: "Tarea eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ msn: "Error al eliminar tarea" });
  }
};

const assignTaskToUsers = async (req, res) => {
  const { taskId } = req.params;
  const { userIds } = req.body; 

  try {
    const taskRes = await fetch(`${DB_URL}/${taskId}`);
    if (!taskRes.ok) return res.status(404).json({ msn: "Tarea no encontrada" });
    const task = await taskRes.json();

    const currentUsers = task.userIds || [];
    const updatedUserIds = [...new Set([...currentUsers, ...userIds])];

    const updateRes = await fetch(`${DB_URL}/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: updatedUserIds })
    });

    res.status(200).json({ msn: "Usuarios asignados", data: await updateRes.json() });
  } catch (error) {
    res.status(500).json({ msn: "Error al asignar usuarios" });
  }
};

const getTaskUsers = async (req, res) => {
  const { taskId } = req.params;

  try {
    const taskRes = await fetch(`${DB_URL}/${taskId}`);
    if (!taskRes.ok) return res.status(404).json({ msn: "Tarea no encontrada" });
    const task = await taskRes.json();

    if (!task.userIds || task.userIds.length === 0) return res.status(200).json([]);

    const query = task.userIds.map(id => `id=${id}`).join('&');
    const usersRes = await fetch(`${USERS_DB_URL}?${query}`);
    
    res.status(200).json(await usersRes.json());
  } catch (error) {
    res.status(500).json({ msn: "Error al obtener usuarios asignados" });
  }
};

const removeUserFromTask = async (req, res) => {
  const { taskId, userId } = req.params;

  try {
    const taskRes = await fetch(`${DB_URL}/${taskId}`);
    if (!taskRes.ok) return res.status(404).json({ msn: "Tarea no encontrada" });
    const task = await taskRes.json();

    const updatedUserIds = (task.userIds || []).filter(id => String(id) !== String(userId));

    const updateRes = await fetch(`${DB_URL}/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: updatedUserIds })
    });

    res.status(200).json({ msn: `Usuario removido`, data: await updateRes.json() });
  } catch (error) {
    res.status(500).json({ msn: "Error al remover usuario" });
  }
};

export {
  getTasks, getTaskById, createTask, updateTask, deleteTask,
  assignTaskToUsers, getTaskUsers, removeUserFromTask
};