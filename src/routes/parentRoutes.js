const express = require('express');
const Parent = require('../models/parent'); // Modelo de padre
const User = require('../models/user'); // Modelo de usuario
const Child = require('../models/child'); // Modelo de usuario
const authMiddleware = require('../middleware/authMiddleware'); // Middleware de autenticación
const { cifrarContraseña } = require('../middleware/vigenere'); // Importar el middleware
const router = express.Router();

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
            nombre,
            contraseña: contraseñaCifrada, // Usar la misma contraseña cifrada
            role: 'parent', // Asignar el rol de padre
            parentId: newParent._id, // Guardar el ID del padre en el usuario
        });

        // Guardar el usuario en la base de datos
        await newUser.save();

        res.status(201).json({ 
            message: 'Padre y usuario registrados exitosamente', 
            parent: newParent, 
            user: newUser 
        });
    } catch (error) {
        console.error('Error al registrar el padre y usuario:', error);
        res.status(500).json({ message: 'Error al registrar el padre y usuario' });
    }
});

// Ruta para crear un perfil infantil y un usuario
router.post('/registrar_hijo', cifrarContraseña, authMiddleware, async (req, res) => {
    const { nombre, apellido, fechaNacimiento, genero, username, avatar, parentId } = req.body; // Obtener parentId desde el cuerpo
    const contraseñaCifrada = req.contraseñaCifrada; // Contraseña cifrada desde el middleware

    try {
        // Verifica si el padre existe
        const parent = await Parent.findById(parentId);
        if (!parent) {
            return res.status(404).json({ message: 'Padre no encontrado' });
        }

        // Crea el usuario en la colección `users`
        const newUser = new User({
            correo: username, // Asume que el username es el correo
            contraseña: contraseñaCifrada, // Usa la contraseña cifrada
            nombre: `${nombre} ${apellido}`,
            role: 'child', // Asigna el rol de niño
            parentId,
        });

        await newUser.save();

        // Crea el perfil del niño en la colección `children`
        const newChild = new Child({
            nombre,
            apellido,
            fechaNacimiento,
            genero,
            username,
            contraseña: contraseñaCifrada, // Usa la contraseña cifrada
            avatar,
            parentId,
            userId: newUser._id, // Relaciona el perfil infantil con el usuario
        });

        await newChild.save();

        // Actualiza el usuario para guardar el ID del niño
        newUser.childId = newChild._id; // Guarda el ID del niño en el usuario
        await newUser.save();

        res.status(201).json({
            message: 'Perfil infantil y usuario creados exitosamente',
            child: newChild,
            user: newUser,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear el perfil infantil y el usuario' });
    }
});

// Obtener hijos de un padre específico
router.get('/children/:parentId',authMiddleware, async (req, res) => {
    try {
        const { parentId } = req.params; // Extrae el ID del padre desde la URL
        
        // Busca los hijos que tienen el parentId correspondiente
        const children = await Child.find({ parentId });

        // Si no hay hijos, envía un mensaje adecuado
        if (!children.length) {
            return res.status(404).json({ message: 'No se encontraron hijos para este padre.' });
        }

        // Responde con los datos de los hijos
        res.json(children);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los hijos', error });
    }
});



router.get('/parent/:parentId/children/status', async (req, res) => {
    try {
      // 1. Obtener todos los hijos del padre
      const children = await Child.find({ parentId: req.params.parentId });
      
      // 2. Obtener el estado de actividad de cada hijo
      const childrenWithStatus = await Promise.all(
        children.map(async (child) => {
          const user = await User.findById(child.userId);
          return {
            id: child._id,
            nombre: child.nombre,
            activo: user?.activo || false,
            lastActive: user?.updatedAt // O puedes tener un campo lastActive en el User
          };
        })
      );
      
      res.json(childrenWithStatus);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el estado de los hijos" });
    }
  });

module.exports = router;

