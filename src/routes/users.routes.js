import express from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser, patchUserStatus } from '../controllers/users.controller.js';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware.js';

const usersRouter = express.Router();

// Todas las rutas de usuarios requerirán estar logueado y ser admin
usersRouter.use(verifyToken, isAdmin); 

usersRouter.get('/', getUsers);
usersRouter.get('/:id', getUserById);
usersRouter.post('/', createUser);
usersRouter.put('/:id', updateUser);
usersRouter.delete('/:id', deleteUser);
usersRouter.patch('/:id/status', patchUserStatus);

export default usersRouter;