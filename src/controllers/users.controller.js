const DB_URL = 'http://localhost:4000/users';

const getUsers = async (req, res) => {
  try {
    const response = await fetch(DB_URL);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ msn: "Error al obtener usuarios" });
  }
};

const getUserById = async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/${req.params.id}`);
    if (!response.ok) return res.status(404).json({ msn: "Usuario no encontrado" });
    res.status(200).json(await response.json());
  } catch (error) {
    res.status(500).json({ msn: "Error de conexión" });
  }
};

const createUser = async (req, res) => {
  const { name, email, document, role } = req.body;
  const newUser = {
    name, email, document,
    role: role || "user",
    status: "activo"
  };

  try {
    const response = await fetch(DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    res.status(201).json({ msn: "Usuario creado", data: await response.json() });
  } catch (error) {
    res.status(500).json({ msn: "Error al crear" });
  }
};

const updateUser = async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/${req.params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    res.status(200).json({ msn: "Usuario actualizado", data: await response.json() });
  } catch (error) {
    res.status(500).json({ msn: "Error al actualizar" });
  }
};

const deleteUser = async (req, res) => {
  try {
    await fetch(`${DB_URL}/${req.params.id}`, { method: 'DELETE' });
    res.status(200).json({ msn: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ msn: "Error al eliminar" });
  }
};

const patchUserStatus = async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/${req.params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: req.body.status })
    });
    res.status(200).json({ msn: "Estado actualizado", data: await response.json() });
  } catch (error) {
    res.status(500).json({ msn: "Error al cambiar estado" });
  }
};

export { getUsers, getUserById, createUser, updateUser, deleteUser, patchUserStatus };