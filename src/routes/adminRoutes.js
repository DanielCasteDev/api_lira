const express = require('express');
const User = require('../models/user'); // Importar el modelo User
const { cifrarContraseña } = require('../middleware/vigenere'); // Middleware para cifrar la contraseña
const authMiddleware = require('../middleware/authMiddleware'); // Middleware de autenticación
const router = express.Router();


module.exports = router;