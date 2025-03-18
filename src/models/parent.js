const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema({
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
    correo: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    telefono: {
        type: String,
        required: true,
        trim: true,
    },
    contraseña: {
        type: String,
        required: true,
    }
}, {
    timestamps: true,
});

const Parent = mongoose.model('Parent', parentSchema);

module.exports = Parent;