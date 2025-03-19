const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware'); // Middleware de autenticación
const router = express.Router();

// Ruta para obtener las colecciones de la base de datos
router.get('/collections', authMiddleware, async (req, res) => {
    try {
        // Obtener todas las colecciones de la base de datos
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map((collection) => collection.name); // Extraer solo los nombres

        // Enviar los nombres de las colecciones como respuesta
        res.status(200).json({
            message: 'Colecciones obtenidas con éxito',
            data: collectionNames,
        });
    } catch (error) {
        console.error('Error al obtener las colecciones:', error);
        res.status(500).json({ message: 'Error al obtener las colecciones', error: error.message });
    }
});

// Ruta para hacer el respaldo de la base de datos y devolverlo como JSON
router.get('/backup', authMiddleware, async (req, res) => {
    try {
        const { collections: collectionsParam } = req.query;
        const collectionsToBackup = collectionsParam ? collectionsParam.split(',') : [];

        // Obtener todas las colecciones de la base de datos
        const allCollections = await mongoose.connection.db.listCollections().toArray();

        const backupData = {}; // Objeto para almacenar los datos del respaldo

        // Recorrer cada colección y obtener sus datos
        for (const collection of allCollections) {
            const collectionName = collection.name;

            // Si se especificaron colecciones, solo respaldar las seleccionadas
            if (collectionsToBackup.length === 0 || collectionsToBackup.includes(collectionName)) {
                const collectionData = await mongoose.connection.db.collection(collectionName).find({}).toArray(); // Obtener todos los documentos
                backupData[collectionName] = collectionData; // Agregar los datos al objeto
            }
        }

        // Enviar el JSON como respuesta
        res.status(200).json({
            message: 'Respaldo generado con éxito',
            data: backupData,
        });
    } catch (error) {
        console.error('Error en la ruta de respaldo:', error);
        res.status(500).json({ message: 'Error en la ruta de respaldo', error: error.message });
    }
});

module.exports = router;