const express = require('express');
const router = express.Router();
const Child = require('../models/child'); // Modelo del niño
const authMiddleware = require('../middleware/authMiddleware'); // Middleware de autenticación

// Ruta para obtener el perfil infantil por ID
router.get('/child-profile/:id', authMiddleware, async (req, res) => {
    try {
        const childId = req.params.id;

        // Buscar el perfil infantil en la base de datos
        const childProfile = await Child.findById(childId)
            .populate('userId', 'correo nombre role')
            .select('-contraseña'); // Excluir la contraseña

        if (!childProfile) {
            return res.status(404).json({ message: 'Perfil infantil no encontrado' });
        }

        // Devolver los datos del perfil infantil
        res.status(200).json({
            message: 'Perfil infantil encontrado',
            childProfile: {
                id: childProfile._id,
                nombre: childProfile.nombre,
                apellido: childProfile.apellido,
                fechaNacimiento: childProfile.fechaNacimiento,
                genero: childProfile.genero,
                username: childProfile.username,
                avatar: childProfile.avatar, 
                parentId: childProfile.parentId,
                userId: childProfile.userId,
                totalPoints: childProfile.totalPoints,
                gameProgress: childProfile.gameProgress
            },
        });
    } catch (error) {
        console.error('Error al obtener el perfil infantil:', error);
        res.status(500).json({ 
            message: 'Error al obtener el perfil infantil',
            error: error.message 
        });
    }
});

// Guardar progreso del juego
router.post('/child-progress', authMiddleware, async (req, res) => {
    try {
        const { childId, gameData, totalPoints } = req.body;

        // Validaciones básicas
        if (!childId || !gameData || !gameData.gameName) {
            return res.status(400).json({ message: 'Datos incompletos' });
        }

        const child = await Child.findById(childId);
        if (!child) {
            return res.status(404).json({ message: 'Niño no encontrado' });
        }

        // Buscar si ya existe progreso para este juego
        const gameIndex = child.gameProgress.findIndex(g => g.gameName === gameData.gameName);
        
        if (gameIndex >= 0) {
            // Actualizar juego existente solo si los nuevos datos son mejores
            if (gameData.points > child.gameProgress[gameIndex].points) {
                child.gameProgress[gameIndex].points = gameData.points;
            }
            if (gameData.levelsCompleted > child.gameProgress[gameIndex].levelsCompleted) {
                child.gameProgress[gameIndex].levelsCompleted = gameData.levelsCompleted;
            }
            if (gameData.highestDifficulty) {
                // Actualizar dificultad si es mayor
                const difficulties = ['fácil', 'medio', 'difícil'];
                const currentLevel = difficulties.indexOf(child.gameProgress[gameIndex].highestDifficulty);
                const newLevel = difficulties.indexOf(gameData.highestDifficulty);
                if (newLevel > currentLevel) {
                    child.gameProgress[gameIndex].highestDifficulty = gameData.highestDifficulty;
                }
            }
            child.gameProgress[gameIndex].lastPlayed = new Date();
        } else {
            // Agregar nuevo juego
            child.gameProgress.push({
                gameName: gameData.gameName,
                points: gameData.points,
                levelsCompleted: gameData.levelsCompleted,
                highestDifficulty: gameData.highestDifficulty,
                lastPlayed: new Date()
            });
        }

        // Actualizar puntos totales (sumando)
        child.totalPoints += totalPoints || 0;

        await child.save();

        res.status(200).json({ 
            message: 'Progreso guardado exitosamente',
            child: {
                id: child._id,
                nombre: child.nombre,
                totalPoints: child.totalPoints,
                gameProgress: child.gameProgress
            }
        });
    } catch (error) {
        console.error('Error al guardar progreso:', error);
        res.status(500).json({ 
            message: 'Error al guardar progreso', 
            error: error.message 
        });
    }
});

// Obtener progreso del niño
router.get('/child-progress/:childId', authMiddleware, async (req, res) => {
    try {
        const childId = req.params.childId;

        const child = await Child.findById(childId)
            .select('nombre apellido totalPoints gameProgress avatar');

        if (!child) {
            return res.status(404).json({ message: 'Niño no encontrado' });
        }

        // Formatear la respuesta
        const response = {
            id: child._id,
            nombre: child.nombre,
            apellido: child.apellido,
            avatar: child.avatar,
            totalPoints: child.totalPoints,
            games: child.gameProgress.map(game => ({
                gameName: game.gameName,
                points: game.points,
                levelsCompleted: game.levelsCompleted,
                highestDifficulty: game.highestDifficulty,
                lastPlayed: game.lastPlayed
            }))
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error al obtener progreso:', error);
        res.status(500).json({ 
            message: 'Error al obtener progreso', 
            error: error.message 
        });
    }
});

// Obtener progreso específico de un juego
router.get('/child-progress/:childId/:gameName', authMiddleware, async (req, res) => {
    try {
        const { childId, gameName } = req.params;

        const child = await Child.findById(childId)
            .select('nombre gameProgress');

        if (!child) {
            return res.status(404).json({ message: 'Niño no encontrado' });
        }

        const gameProgress = child.gameProgress.find(g => g.gameName === gameName);

        if (!gameProgress) {
            return res.status(404).json({ 
                message: 'No se encontró progreso para este juego',
                gameName
            });
        }

        res.status(200).json({
            childId: child._id,
            childName: child.nombre,
            gameProgress
        });
    } catch (error) {
        console.error('Error al obtener progreso del juego:', error);
        res.status(500).json({ 
            message: 'Error al obtener progreso del juego', 
            error: error.message 
        });
    }
});

router.get('/parent/children_progress', authMiddleware, async (req, res) => {
    try {
        console.log("Usuario autenticado:", req.user);
        
        if (!req.user || !req.user.id) {
            return res.status(400).json({ 
                success: false,
                message: "Usuario no autenticado o ID de usuario no disponible" 
            });
        }

        const parentId = req.user.id;
        console.log("Buscando niños para parentId:", parentId);

        const children = await Child.find({ parentId: parentId })
            .select('nombre apellido avatar totalPoints gameProgress')
            .lean();

        console.log("Niños encontrados:", children);

        if (!children || children.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'No se encontraron niños asociados a este padre' 
            });
        }

        res.status(200).json({ 
            success: true,
            children: children // Envía directamente el array de niños
        });
    } catch (error) {
        console.error('Error al obtener progreso de los niños:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error al obtener progreso de los niños', 
            error: error.message 
        });
    }
});

module.exports = router;


