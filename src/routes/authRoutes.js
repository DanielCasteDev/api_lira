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

// Guardado en memoria temporal
const tvSessions = {}; // Recomendado: luego lo pasas a base de datos si quieres persistencia

// POST /tv-login → el celular manda el nombre del usuario y el token QR después del login
router.post('/tv-login', (req, res) => {
    const { qr_token, nombre } = req.body;

    if (!qr_token || !nombre) {
        return res.status(400).json({ message: 'Faltan parámetros: qr_token o nombre.' });
    }

    tvSessions[qr_token] = { nombre };

    return res.status(200).json({ message: 'Token vinculado correctamente.' });
});

// GET /tv-login-status/:qr_token → la TV consulta si ya se autenticó
router.get('/tv-login-status/:qr_token', (req, res) => {
    const token = req.params.qr_token;

    if (tvSessions[token]) {
        return res.status(200).json({ nombre: tvSessions[token].nombre });
    } else {
        return res.status(200).json({}); // Aún no hay nombre vinculado
    }
});

module.exports = router;