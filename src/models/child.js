const mongoose = require('mongoose');

const childSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true,
    },
    apellido: {
        type: String,
        required: true,
        trim: true,
    },
    fechaNacimiento: {
        type: Date,
        required: true,
    },
    genero: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    contraseña: {
        type: String,
        required: true,
    },
    avatar: {
        type: String, // Puedes guardar la URL de la imagen o el base64
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Parent',
        required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Referencia al usuario

}, {
    timestamps: true,
});

const Child = mongoose.model('Child', childSchema);

module.exports = Child;