const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    correo: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    contraseña: {
        type: String,
        required: true,
    },
    nombre: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['parent', 'child', 'admin'], // Roles posibles
        default: 'parent', // Por defecto, el usuario es un padre
    },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent' }, // Referencia al padre
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child' }, // Referencia al niño
    activo: { // Nuevo campo para el estado de activo/inactivo
        type: Boolean,
        default: false, // Por defecto, el usuario está activo
    },
},
 {
    timestamps: true,
});

const User = mongoose.model('User', userSchema);

module.exports = User;