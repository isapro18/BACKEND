const getTasks = (req, res) => {
  res
    .status(200)
    .json({ 
        msn: "Aquí se listarán las tareas (Endpoint GET funcionando)" 
    });
};

const createTask = (req, res) => {
  const {userId, title, body } = req.body;
  res
    .status(201)
    .json({ 
      msn: "Tarea creada.",
      data: {
        userId, title, body
      }
    });
};

const updateTask = (req, res) => {
  const { id } = req.params;
  console.log("Actualizando tarea con ID:", id);
  const { userId, title, body } = req.body;
};

export {
  getTasks,
  createTask,
  updateTask
};
