const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware'); // Middleware de autenticación
const router = express.Router();

// Ruta para hacer el respaldo de la base de datos y devolverlo como JSON
router.get('/backup', authMiddleware, async (req, res) => {
    try {
        // Obtener todas las colecciones de la base de datos
        const collections = await mongoose.connection.db.listCollections().toArray();

        const backupData = {}; // Objeto para almacenar los datos del respaldo

        // Recorrer cada colección y obtener sus datos
        for (const collection of collections) {
            const collectionName = collection.name;
            const collectionData = await mongoose.connection.db.collection(collectionName).find({}).toArray(); // Obtener todos los documentos
            backupData[collectionName] = collectionData; // Agregar los datos al objeto
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