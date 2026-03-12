import express from 'express';
import { 
  getTasks, getTaskById, createTask, updateTask, deleteTask,
  assignTaskToUsers, getTaskUsers, removeUserFromTask
} from '../controllers/tasks.controller.js';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware.js';

const tasksRouter = express.Router();

tasksRouter.get('/', verifyToken, isAdmin, getTasks);
tasksRouter.post('/', verifyToken, isAdmin, createTask);
tasksRouter.get('/:id', verifyToken, getTaskById); 
tasksRouter.put('/:id', verifyToken, isAdmin, updateTask);
tasksRouter.delete('/:id', verifyToken, isAdmin, deleteTask);

tasksRouter.post('/:taskId/assign', verifyToken, isAdmin, assignTaskToUsers);
tasksRouter.get('/:taskId/users', verifyToken, isAdmin, getTaskUsers);
tasksRouter.delete('/:taskId/users/:userId', verifyToken, isAdmin, removeUserFromTask);

export default tasksRouter;