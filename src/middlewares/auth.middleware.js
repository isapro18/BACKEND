const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ msn: "Acceso denegado. Token no proporcionado." });
    }

    const token = authHeader.split(' ')[1]; // Ej: "token-10-admin"
    
    try {
        // Desarmamos el token simulado para extraer el ID y el Rol
        const partes = token.split('-'); 
        req.user = {
            id: partes[1],
            role: partes[2]
        };
        next(); // Pasa a la siguiente función
    } catch (error) {
        res.status(403).json({ msn: "Token inválido." });
    }
};

// Verificación exclusiva para administradores
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msn: "Acceso denegado. Se requieren permisos de administrador." });
    }
    next();
};

export { verifyToken, isAdmin };