import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import userRoutes from './routes/users.routes.js';
import taskRoutes from './routes/tasks.routes.js';

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
const PORT = 3000;

app.get('/', (req, res) => {
  res
    .status(200)
    .json({ 
        msn: "Hola, esto es un servidor Express Nano (Endpoint raíz funcionando)" 
    });
}); 

app.use('/users', userRoutes);
app.use('/tasks', taskRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});