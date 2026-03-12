import express from 'express';

const tasksRouter = express.Router();

tasksRouter.get('/', (req, res) => {
  res
    .status(200)
    .json({ 
        msn: "Aquí se listarán las tareas (Endpoint GET funcionando)" 
    });
});

tasksRouter.post('/', (req, res) => {
  res
    .status(201)
    .json({ 
        msn: "Aquí se creará una tarea (Endpoint POST funcionando)" 
    });
});

tasksRouter.put('/:id', (req, res) => {
  res
    .status(200)
    .json({ 
        msn: `Aquí se actualizará la tarea con ID ${req.params.id} (Endpoint PUT funcionando)` 
    });
});

tasksRouter.delete('/:id', (req, res) => {
  res
    .status(200)
    .json({ 
        msn: "Aquí se eliminará la tarea (Endpoint DELETE funcionando)" 
    });
});

export default tasksRouter;

// Array de tareas en memoria
let tasks = [
  { id: 1, title: "Tarea ejemplo 1", status: "pendiente" },
  { id: 2, title: "Tarea ejemplo 2", status: "pendiente" }
];

// Finalización de Tareas
tasksRouter.patch('/:id/status', (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;

  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({
      msn: `No se encontró la tarea con ID ${id}`
    });
  }

  task.status = status;

  res.status(200).json({
    msn: "Estado de la tarea actualizado correctamente",
    data: task
  });
});

// Visualización Global de Tareas para el Administrador
tasksRouter.get('/admin', (req, res) => {
  res.status(200).json({
    msn: "Todas las tareas del sistema",
    data: tasks
  });
});


