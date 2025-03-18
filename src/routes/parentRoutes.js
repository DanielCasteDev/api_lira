const express = require('express');
const Parent = require('../models/parent'); // Modelo de padre
const User = require('../models/user'); // Modelo de usuario
const { cifrarContraseña } = require('../middleware/vigenere'); // Importar el middleware
const router = express.Router();

// Ruta para registrar un nuevo padre y usuario
router.post('/register', cifrarContraseña, async (req, res) => {
    try {
        const { nombre, apellido, correo, telefono, contraseña } = req.body;
        const contraseñaCifrada = req.contraseñaCifrada; // Contraseña cifrada desde el middleware

        // Crear una nueva instancia del modelo Parent
        const newParent = new Parent({
            nombre,
            apellido,
            correo,
            telefono,
            contraseña: contraseñaCifrada,
            
        });
        // Guardar el padre en la base de datos
        await newParent.save();

        // Crear una nueva instancia del modelo User
        const newUser = new User({
            correo,
            contraseña: contraseñaCifrada, // Usar la misma contraseña cifrada
            role: 'parent', // Asignar el rol de padre
        });

        // Guardar el usuario en la base de datos
        await newUser.save();

        res.status(201).json({ message: 'Padre y usuario registrados exitosamente', parent: newParent, user: newUser });
    } catch (error) {
        console.error('Error al registrar el padre y usuario:', error);
        res.status(500).json({ message: 'Error al registrar el padre y usuario' });
    }
});

module.exports = router;