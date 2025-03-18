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
    role: {
        type: String,
        enum: ['parent', 'admin'], // Roles posibles
        default: 'parent', // Por defecto, el usuario es un padre
    },
}, {
    timestamps: true,
});

const User = mongoose.model('User', userSchema);

module.exports = User;