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
            { expiresIn: '8h' } // Tiempo de expiración (1 hora)
        );

        // Guardar el token en la base de datos (opcional)
        usuario.token = token;
        await usuario.save();

        // Responder con éxito y los datos del usuario
        res.status(200).json({
            message: 'Login exitoso',
            user: {
                _id: usuario.parentId, // Asegúrate de incluir el _id
                id_usuario: usuario._id, // Asegúrate de incluir el _id

                correo: usuario.correo,
                role: usuario.role,
                nombre:usuario.nombre,
                id_niño:usuario.childId // Enviar el rol del usuario
            },
            token, // Enviar el token en la respuesta
        });

    } catch (error) {
        console.error('Error al intentar loguearse:', error);
        res.status(500).json({ message: 'Error al intentar loguearse.', error });
    }
});

// LOGIN EXCLUSIVO PARA TV
router.post('/tv-login', async (req, res) => {
    try {
        const { correo, contraseña, qr_token } = req.body;

        if (!correo || !contraseña || !qr_token) {
            return res.status(400).json({ message: 'Correo, contraseña y qr_token son obligatorios.' });
        }

        // Buscar el usuario
        const usuario = await User.findOne({ correo });
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Verificar contraseña
        const clave = 'claveSecreta';
        const contraseñaDescifrada = cifradoVigenere(usuario.contraseña, clave, false);
        if (contraseñaDescifrada !== contraseña) {
            return res.status(401).json({ message: 'Contraseña incorrecta.' });
        }

        // Generar token
        const token = jwt.sign(
            { userId: usuario._id, correo: usuario.correo, role: usuario.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        usuario.token = token;
        await usuario.save();

        // Datos completos del usuario
        const userData = {
            _id: usuario.parentId,
            id_usuario: usuario._id,
            correo: usuario.correo,
            role: usuario.role,
            nombre: usuario.nombre,
            id_niño: usuario.childId
        };

        // Guardar en sesiones para TV
        tvSessions[qr_token] = {
            user: userData,
            token
        };

        res.status(200).json({
            message: 'Login de TV exitoso',
            user: userData,
            token
        });

    } catch (error) {
        console.error('Error en tv-login:', error);
        res.status(500).json({ message: 'Error en tv-login.', error });
    }
});

// TV consulta si ya se autenticó
router.get('/tv-login-status/:qr_token', (req, res) => {
    const token = req.params.qr_token;

    if (tvSessions[token]) {
        return res.status(200).json(tvSessions[token]);
    } else {
        return res.status(200).json({}); // Aún no hay datos vinculados
    }
});

module.exports = router;