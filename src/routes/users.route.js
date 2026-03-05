import express  from 'express';

const usersRouter = express.Router();

usersRouter.get('/', (req, res) => {
  res
    .status(200)
    .json({ 
        msn: "Aquí se listarán los usuarios (Endpoint GET funcionando)" 
    });
});

usersRouter.post('/', (req, res) => {
  res
    .status(201)
    .json({ 
        msn: "Aquí se creará un usuario (Endpoint POST funcionando)" 
    });
});

usersRouter.put('/:id', (req, res) => {
  res
    .status(200)
    .json({ 
        msn: "Aquí se actualizará el usuario (Endpoint PUT funcionando)" 
    });
});

usersRouter.delete('/:id', (req, res) => {
  res
    .status(200)
    .json({ 
        msn: "Aquí se eliminará el usuario (Endpoint DELETE funcionando)" 
    });
});

export default usersRouter;