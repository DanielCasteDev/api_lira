const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Para Web Push
    endpoint: {
        type: String,
        required: function() {
            return this.type === 'web';
        },
    },
    keys: {
        p256dh: {
            type: String,
            required: function() {
                return this.type === 'web';
            },
        },
        auth: {
            type: String,
            required: function() {
                return this.type === 'web';
            },
        },
    },
    // Para OneSignal (móvil)
    playerId: {
        type: String,
        required: function() {
            return this.type === 'mobile';
        },
    },
    // Tipo de suscripción: 'web' o 'mobile'
    type: {
        type: String,
        enum: ['web', 'mobile'],
        default: 'web',
        required: true,
    },
    platform: {
        type: String,
        enum: ['android', 'ios', 'web'],
    },
},
{
    timestamps: true,
});

// Índice único para evitar duplicados por usuario y endpoint (web) o playerId (mobile)
subscriptionSchema.index({ userId: 1, endpoint: 1 }, { 
    unique: true, 
    partialFilterExpression: { type: 'web' } 
});
subscriptionSchema.index({ userId: 1, playerId: 1 }, { 
    unique: true, 
    partialFilterExpression: { type: 'mobile' } 
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;



