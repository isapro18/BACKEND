const DB_URL = 'http://localhost:4000/users'; 

const login = async (req, res) => {
  const { document, password } = req.body;

  if (!document || !password) {
    return res.status(400).json({ msn: "El documento y la contraseña son obligatorios" });
  }

  const lastFourDigits = String(document).slice(-4);
  
  if (password !== lastFourDigits) {
    return res.status(401).json({ msn: "Credenciales incorrectas" });
  }

  try {
    const response = await fetch(`${DB_URL}?document=${document}`);
    const users = await response.json();

    if (users.length === 0) {
      return res.status(404).json({ msn: "Usuario no encontrado" });
    }

    const user = users[0];

    if (user.status !== "activo") {
      return res.status(403).json({ msn: "Usuario inactivo. Contacte al administrador." });
    }

    // El token incluye el ID y el Rol para que el Middleware los pueda leer
    const token = `token-${user.id}-${user.role}`;

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
    res.status(500).json({ msn: "Error interno del servidor" });
  }
};

export { login };