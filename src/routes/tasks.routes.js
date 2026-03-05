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

