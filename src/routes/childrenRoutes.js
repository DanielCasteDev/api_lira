const express = require('express');
const Child = require('../models/child'); // Modelo de usuario
const authMiddleware = require('../middleware/authMiddleware'); // Middleware de autenticación
const router = express.Router();

// Ruta para obtener el perfil infantil por ID
router.get('/child-profile/:id', authMiddleware, async (req, res) => {
    try {
        const childId = req.params.id;

        // Buscar el perfil infantil en la base de datos
        const childProfile = await Child.findById(childId).populate('userId', 'correo nombre role');

        if (!childProfile) {
            return res.status(404).json({ message: 'Perfil infantil no encontrado' });
        }

        // Devolver los datos del perfil infantil, incluyendo la imagen en base64
        res.status(200).json({
            message: 'Perfil infantil encontrado',
            childProfile: {
                nombre: childProfile.nombre,
                apellido: childProfile.apellido,
                fechaNacimiento: childProfile.fechaNacimiento,
                genero: childProfile.genero,
                username: childProfile.username,
                avatar: childProfile.avatar, 
                parentId: childProfile.parentId,
                userId: childProfile.userId,
            },
        });
    } catch (error) {
        console.error('Error al obtener el perfil infantil:', error);
        res.status(500).json({ message: 'Error al obtener el perfil infantil' });
    }
});


module.exports = router;
