import express from 'express';
import { getTasks, createTask, updateTask } from '../controller/tasks.controller.js';

const tasksRouter = express.Router();

tasksRouter.get('/', getTasks);

tasksRouter.post('/', createTask);

tasksRouter.put('/:id', updateTask);

export default tasksRouter;