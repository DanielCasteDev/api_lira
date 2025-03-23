const express = require('express');
const User = require('../models/user'); // Importar el modelo User
const authMiddleware = require('../middleware/authMiddleware'); // Middleware de autenticación

const router = express.Router();


// Ruta para marcar un usuario como activo
router.put("/:userId/activate", async (req, res) => {
    const { userId } = req.params;
  
    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { activo: true }, // Marcar como activo
        { new: true }
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
  
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error al marcar como activo:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });


  // Ruta para marcar un usuario como inactivo
router.put("/:userId/deactivate", async (req, res) => {
    const { userId } = req.params;
  
    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { activo: false }, // Marcar como inactivo
        { new: true }
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
  
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error al marcar como inactivo:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

// Ruta para obtener el estado de todos los usuarios (activo/inactivo)
router.get("/status",authMiddleware, async (req, res) => {
  try {
    // Obtener todos los usuarios con solo el campo "activo"
    const users = await User.find({}, { correo: 1, activo: 1 });

    // Devolver el estado de todos los usuarios
    res.status(200).json(users);
  } catch (error) {
    console.error("Error al obtener el estado de los usuarios:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});
module.exports = router;
