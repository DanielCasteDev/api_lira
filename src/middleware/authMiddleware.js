const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header("Authorization");
    console.log("Token recibido:", token); // Depuración
    if (!token) {
        return res.status(401).json({ message: "Acceso denegado. No hay token." });
    }
    try {
        const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
        console.log("Token decodificado:", decoded); // Depuración
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Error al verificar el token:", error); // Depuración
        res.status(401).json({ message: "Token inválido." });
    }
};

module.exports = authMiddleware;