const express = require('express');
const jwt = require('jsonwebtoken'); // Importar JWT
const User = require('../models/user'); // Importar el modelo User
const { cifradoVigenere } = require('../middleware/vigenere'); // Importar la función cifradoVigenere
const nodemailer = require('nodemailer'); // Importar Nodemailer
const router = express.Router();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Usar SSL
  auth: {
    user: 'educacionlira@gmail.com', // Tu dirección de Gmail
    pass: 'umljijusqjqsmgyo' // La contraseña de aplicación generada
  },
  tls: {
    rejectUnauthorized: false // Ignorar errores de certificado (solo para pruebas)
  }
});

// Función para enviar el correo de restablecimiento
const sendResetEmail = (email, token) => {
    const resetLink = `https://app-lira.vercel.app/reset-password/${token}`;
  
    const mailOptions = {
      from: 'educacionlira@gmail.com',
      to: email,
      subject: 'Restablecimiento de contraseña - Lira',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
            <!-- Nombre de Lira -->
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #ff6f00; font-size: 24px; font-weight: bold; margin: 0;">
                Lira
              </h1>
            </div>
  
            <!-- Título -->
            <h2 style="color: #333333; text-align: center; font-size: 20px; margin-bottom: 15px;">
              Restablecer tu contraseña
            </h2>
  
            <!-- Mensaje principal -->
            <p style="color: #555555; font-size: 14px; text-align: center; line-height: 1.5; margin-bottom: 20px;">
              Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong style="color: #ff6f00;">Lira</strong>. Si no fuiste tú, ignora este correo.
            </p>
  
            <!-- Botón de restablecimiento -->
            <div style="text-align: center; margin-bottom: 20px;">
              <a href="${resetLink}" style="background-color: #ff6f00; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 14px; font-weight: bold; display: inline-block;">
                Restablecer contraseña
              </a>
            </div>
  
            <!-- Enlace alternativo -->
            <p style="color: #777777; font-size: 12px; text-align: center; margin-bottom: 20px;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:
              <br>
              <span style="color: #ff6f00; word-break: break-all;">${resetLink}</span>
            </p>
  
            <!-- Mensaje de expiración -->
            <p style="color: #999999; font-size: 12px; text-align: center; margin-bottom: 20px;">
              Este enlace expirará en <strong>1 hora</strong>.
            </p>
  
            <!-- Agradecimiento -->
            <p style="color: #555555; font-size: 12px; text-align: center; line-height: 1.5; margin-bottom: 0;">
              Gracias por confiar en <strong style="color: #ff6f00;">Lira</strong>. Estamos aquí para ayudarte.
            </p>
  
            <!-- Pie de página -->
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 10px; margin-bottom: 5px;">
                Si tienes alguna pregunta, no dudes en contactarnos en <a href="mailto:soporte@lira.com" style="color: #ff6f00; text-decoration: none;">soporte@lira.com</a>.
              </p>
              <p style="color: #999999; font-size: 10px; margin-bottom: 0;">
                &copy; 2025 Lira. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      `
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar el correo:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });
  };

// Ruta para solicitar restablecimiento de contraseña
router.post('/forgot-password', async (req, res) => {
  try {
    const { correo } = req.body;

    // Validar que se proporcionó el correo
    if (!correo) {
      return res.status(400).json({ message: 'El correo es obligatorio.' });
    }

    // Buscar el usuario en la base de datos
    const usuario = await User.findOne({ correo });

    // Verificar si el usuario existe
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Generar un token JWT para el restablecimiento de contraseña
    const token = jwt.sign(
      { userId: usuario._id }, // Payload
      process.env.JWT_SECRET, // Clave secreta
      { expiresIn: '1h' } // Tiempo de expiración (1 hora)
    );

    // Enviar el correo electrónico con el token
    sendResetEmail(correo, token);

    res.status(200).json({ message: 'Correo de restablecimiento enviado.' });
  } catch (error) {
    console.error('Error al solicitar restablecimiento de contraseña:', error);
    res.status(500).json({ message: 'Error al solicitar restablecimiento de contraseña.', error });
  }
});

// Ruta para restablecer la contraseña
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { nuevaContraseña } = req.body;

    // Validar que se proporcionó la nueva contraseña
    if (!nuevaContraseña) {
      return res.status(400).json({ message: 'La nueva contraseña es obligatoria.' });
    }

    // Verificar el token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Buscar el usuario en la base de datos
    const usuario = await User.findById(userId);

    // Verificar si el usuario existe
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Cifrar la nueva contraseña usando cifrado Vigenère
    const clave = 'claveSecreta'; // Clave fija para el cifrado
    const contraseñaCifrada = cifradoVigenere(nuevaContraseña, clave, true);

    // Actualizar la contraseña en la base de datos
    usuario.contraseña = contraseñaCifrada;
    await usuario.save();

    res.status(200).json({ message: 'Contraseña restablecida con éxito.' });
  } catch (error) {
    console.error('Error al restablecer la contraseña:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Token inválido o expirado.' });
    }
    res.status(500).json({ message: 'Error al restablecer la contraseña.', error });
  }
});
// Agrega esta ruta en tu archivo backend (justo antes de module.exports)
router.get('/verify-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verificar el token JWT
    jwt.verify(token, process.env.JWT_SECRET);
    
    // Si llega aquí, el token es válido
    res.status(200).json({ valid: true });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ valid: false, message: 'Token inválido o expirado' });
    }
    res.status(500).json({ message: 'Error al verificar el token', error });
  }
});

module.exports = router;

