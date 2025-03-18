const express = require('express');
const User = require('../models/user'); // Importar el modelo User
const authMiddleware = require('../middleware/authMiddleware'); // Middleware de autenticación
const router = express.Router();

// Ruta protegida para obtener todos los usuarios
router.get('/users', authMiddleware, async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los usuarios", error: error.message });
    }
});

module.exports = router;

