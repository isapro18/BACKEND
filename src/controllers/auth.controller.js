import pool from '../config/db.js';
import jwt from 'jsonwebtoken';

const login = async (req, res) => {
  // 1. Extraemos SOLO el documento, que es lo único que envía el Frontend
  const { document } = req.body;

  if (!document) {
    return res.status(400).json({ msn: "El documento es obligatorio para iniciar sesión" });
  }

  try {
    // 2. Buscamos al usuario en nuestra nueva base de datos MySQL
    const [users] = await pool.query('SELECT * FROM users WHERE document = ?', [document]);

    // Si el arreglo viene vacío, el usuario no existe
    if (users.length === 0) {
      return res.status(404).json({ msn: "Usuario no encontrado en el sistema" });
    }

    // 3. Seleccionamos al usuario encontrado
    const user = users[0];

    // 4. Firmamos el Token JWT usando la llave secreta de nuestro .env
    const payload = {
      id: user.id,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '2h' // El token durará 2 horas
    });

    // 5. Devolvemos el pase VIP al Frontend
    res.status(200).json({
      msn: "Autenticación exitosa",
      token: token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ msn: "Error interno del servidor al conectar con la base de datos" });
  }
};

export { login };