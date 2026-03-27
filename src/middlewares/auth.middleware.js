import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ msn: "Acceso denegado. Token no proporcionado." });
    }

    const token = authHeader.split(' ')[1]; 
    
    try {
        // VERIFICACIÓN REAL: Usamos la llave secreta del .env para desencriptar
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Inyectamos los datos del usuario (id y role) en la petición
        req.user = decoded; 
        
        next(); 
    } catch (error) {
        // Si el token expiró o es falso, entrará aquí
        return res.status(403).json({ msn: "Token inválido o expirado." });
    }
};

// Verificación exclusiva para administradores
const isAdmin = (req, res, next) => {
    // Verificamos que el rol inyectado sea exactamente 'admin'
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ msn: "Acceso denegado. Se requieren permisos de administrador." });
    }
    next();
};

export { verifyToken, isAdmin };