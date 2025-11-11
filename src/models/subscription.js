const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    endpoint: {
        type: String,
        required: true,
    },
    keys: {
        p256dh: {
            type: String,
            required: true,
        },
        auth: {
            type: String,
            required: true,
        },
    },
},
{
    timestamps: true,
});

// Índice único para evitar duplicados por usuario y endpoint
subscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;

