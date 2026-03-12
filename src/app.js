import express from 'express';
import cors from 'cors';
import userRoutes from './routes/users.routes.js';
import taskRoutes from './routes/tasks.routes.js';
import authRoutes from './routes/auth.routes.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 3000;

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ msn: "Servidor Express funcionando correctamente" });
}); 

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});