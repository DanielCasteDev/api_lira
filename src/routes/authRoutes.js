const express = require('express');
const jwt = require('jsonwebtoken'); // Importar JWT
const User = require('../models/user'); // Importar el modelo User
const { cifradoVigenere } = require('../middleware/vigenere'); // Importar la función cifradoVigenere
const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { correo, contraseña } = req.body;

        // Validar que se proporcionen el correo y la contraseña
        if (!correo || !contraseña) {
            return res.status(400).json({ message: 'El correo y la contraseña son obligatorios.' });
        }

        // Buscar el usuario en la base de datos
        const usuario = await User.findOne({ correo });

        // Verificar si el usuario existe
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Descifrar la contraseña almacenada
        const clave = 'claveSecreta'; // Clave fija para el cifrado
        const contraseñaDescifrada = cifradoVigenere(usuario.contraseña, clave, false);

        // Comparar la contraseña descifrada con la proporcionada
        if (contraseñaDescifrada !== contraseña) {
            return res.status(401).json({ message: 'Contraseña incorrecta.' });
        }

        // Generar un token JWT
        const token = jwt.sign(
            { userId: usuario._id, correo: usuario.correo, role: usuario.role }, // Payload
            process.env.JWT_SECRET, // Clave secreta
            { expiresIn: '1h' } // Tiempo de expiración (1 hora)
        );

        // Guardar el token en la base de datos (opcional)
        usuario.token = token;
        await usuario.save();

        // Responder con éxito y los datos del usuario
        res.status(200).json({
            message: 'Login exitoso',
            user: {
                _id: usuario._id, // Asegúrate de incluir el _id

                correo: usuario.correo,
                role: usuario.role, // Enviar el rol del usuario
            },
            token, // Enviar el token en la respuesta
        });

    } catch (error) {
        console.error('Error al intentar loguearse:', error);
        res.status(500).json({ message: 'Error al intentar loguearse.', error });
    }
});

module.exports = router;