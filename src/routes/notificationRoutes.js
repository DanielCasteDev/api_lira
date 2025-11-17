const express = require('express');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const Subscription = require('../models/subscription');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Cargar claves VAPID desde archivo JSON
const vapidKeysPath = path.join(__dirname, '../../vapid-keys.json');
let vapidKeys = {};

// Función para cargar o generar claves VAPID
const loadVapidKeys = () => {
    try {
        // Intentar cargar desde archivo JSON
        if (fs.existsSync(vapidKeysPath)) {
            const vapidKeysData = fs.readFileSync(vapidKeysPath, 'utf8');
            vapidKeys = JSON.parse(vapidKeysData);
            console.log('✅ Claves VAPID cargadas desde archivo JSON');
            return true;
        }
        
        // Si no existe, generar nuevas claves automáticamente
        console.log('⚠️ Archivo vapid-keys.json no encontrado. Generando nuevas claves...');
        const generatedKeys = webpush.generateVAPIDKeys();
        vapidKeys = {
            publicKey: generatedKeys.publicKey,
            privateKey: generatedKeys.privateKey
        };
        
        // Guardar en archivo JSON
        fs.writeFileSync(vapidKeysPath, JSON.stringify(vapidKeys, null, 2));
        console.log('✅ Claves VAPID generadas y guardadas en vapid-keys.json');
        console.log('📋 Public Key:', generatedKeys.publicKey);
        return true;
    } catch (error) {
        console.error('❌ Error al cargar/generar las claves VAPID:', error);
        return false;
    }
};

// Cargar las claves al iniciar
const keysLoaded = loadVapidKeys();

if (keysLoaded && vapidKeys.publicKey && vapidKeys.privateKey) {
    // Configurar web-push con las claves VAPID
    try {
        webpush.setVapidDetails(
            'mailto:admin@lira.com',
            vapidKeys.publicKey,
            vapidKeys.privateKey
        );
        console.log('✅ Web-push configurado correctamente con las claves VAPID');
    } catch (error) {
        console.error('❌ Error al configurar web-push:', error);
    }
} else {
    console.error('❌ No se pudieron cargar las claves VAPID');
}

// Ruta para obtener la clave pública VAPID
router.get('/vapid-public-key', (req, res) => {
    try {
        console.log('🔑 [Backend] Solicitud de clave pública VAPID recibida:', {
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString()
        });

        if (!vapidKeys.publicKey) {
            console.error('❌ [Backend] Las claves VAPID no están configuradas');
            return res.status(500).json({ message: 'Las claves VAPID no están configuradas. Por favor, contacta al administrador.' });
        }

        console.log('✅ [Backend] Clave pública VAPID enviada:', {
            publicKeyLength: vapidKeys.publicKey.length,
            publicKeyPreview: vapidKeys.publicKey.substring(0, 20) + '...',
            timestamp: new Date().toISOString()
        });

        res.json({ publicKey: vapidKeys.publicKey });
    } catch (error) {
        console.error('❌ [Backend] Error al obtener la clave pública VAPID:', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({ message: 'Error al obtener la clave pública VAPID' });
    }
});

// Ruta para registrar una suscripción
router.post('/subscribe', authMiddleware, async (req, res) => {
    const startTime = Date.now();
    try {
        const userId = req.user.userId;
        const userEmail = req.user.correo;
        const { endpoint, keys } = req.body;

        console.log('📥 [Backend] Recibida solicitud de suscripción:', {
            userId,
            userEmail,
            endpoint: endpoint?.substring(0, 50) + '...',
            hasKeys: !!(keys && keys.p256dh && keys.auth),
            timestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress
        });

        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            console.warn('⚠️ [Backend] Datos de suscripción incompletos:', {
                userId,
                hasEndpoint: !!endpoint,
                hasKeys: !!keys,
                hasP256dh: !!keys?.p256dh,
                hasAuth: !!keys?.auth,
                timestamp: new Date().toISOString()
            });
            return res.status(400).json({ message: 'Datos de suscripción incompletos' });
        }

        // Buscar si ya existe una suscripción
        const existingSubscription = await Subscription.findOne({ userId, endpoint });
        if (existingSubscription) {
            console.log('🔄 [Backend] Actualizando suscripción existente:', {
                userId,
                userEmail,
                subscriptionId: existingSubscription._id,
                endpoint: endpoint.substring(0, 50) + '...',
                timestamp: new Date().toISOString()
            });
        } else {
            console.log('🆕 [Backend] Creando nueva suscripción:', {
                userId,
                userEmail,
                endpoint: endpoint.substring(0, 50) + '...',
                timestamp: new Date().toISOString()
            });
        }

        // Buscar o crear la suscripción
        const subscription = await Subscription.findOneAndUpdate(
            { userId, endpoint },
            {
                userId,
                endpoint,
                keys: {
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                },
                type: 'web',
                platform: 'web',
            },
            { upsert: true, new: true }
        );

        const duration = Date.now() - startTime;
        console.log('✅ [Backend] Suscripción registrada exitosamente:', {
            userId,
            userEmail,
            subscriptionId: subscription._id,
            endpoint: endpoint.substring(0, 50) + '...',
            isNew: !existingSubscription,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });

        // Obtener el usuario para log adicional
        const user = await User.findById(userId);
        if (user) {
            console.log('👤 [Backend] Información del usuario:', {
                userId: user._id,
                email: user.correo,
                nombre: user.nombre,
                role: user.role,
                timestamp: new Date().toISOString()
            });
        }

        // Contar suscripciones del usuario
        const userSubscriptionsCount = await Subscription.countDocuments({ userId });
        console.log('📊 [Backend] Total de suscripciones del usuario:', {
            userId,
            userEmail,
            totalSubscriptions: userSubscriptionsCount,
            timestamp: new Date().toISOString()
        });

        res.status(201).json({ 
            message: 'Suscripción registrada correctamente', 
            subscription: {
                _id: subscription._id,
                userId: subscription.userId,
                endpoint: subscription.endpoint.substring(0, 50) + '...',
                createdAt: subscription.createdAt
            }
        });
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('❌ [Backend] Error al registrar la suscripción:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.userId,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({ message: 'Error al registrar la suscripción' });
    }
});

// Ruta para enviar notificación a un usuario
router.post('/send-to-user', authMiddleware, async (req, res) => {
    try {
        // Verificar que el usuario sea administrador
        const adminUser = await User.findById(req.user.userId);
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({ message: 'No tienes permisos para enviar notificaciones' });
        }

        const { userId, title, body, icon, badge, data } = req.body;

        if (!userId || !title || !body) {
            return res.status(400).json({ message: 'Datos incompletos. Se requieren userId, title y body' });
        }

        // Obtener todas las suscripciones del usuario
        const subscriptions = await Subscription.find({ userId });
        
        console.log('🔍 [Backend] Buscando suscripciones para usuario:', {
            userId,
            totalSubscriptions: subscriptions.length,
            subscriptions: subscriptions.map(sub => ({
                endpoint: sub.endpoint ? sub.endpoint.substring(0, 50) + '...' : null,
            })),
            timestamp: new Date().toISOString()
        });

        if (subscriptions.length === 0) {
            console.warn('⚠️ [Backend] Usuario no tiene suscripciones activas:', {
                userId,
                timestamp: new Date().toISOString()
            });
            return res.status(404).json({ message: 'El usuario no tiene suscripciones activas' });
        }

        const payload = JSON.stringify({
            title,
            body,
            icon: icon || '/lira.png',
            badge: badge || '/lira.png',
            data: data || {},
        });

        const results = [];

        // Enviar notificaciones web
        for (const subscription of subscriptions) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.keys.p256dh,
                            auth: subscription.keys.auth,
                        },
                    },
                    payload
                );
                results.push({ success: true, type: 'web', endpoint: subscription.endpoint });
            } catch (error) {
                console.error('Error al enviar notificación web:', error);
                // Si la suscripción es inválida, eliminarla
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await Subscription.findByIdAndDelete(subscription._id);
                }
                results.push({ success: false, type: 'web', endpoint: subscription.endpoint, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        res.json({
            message: `Notificación enviada a ${successCount} de ${subscriptions.length} dispositivos`,
            results,
        });
    } catch (error) {
        console.error('Error al enviar notificación:', error);
        res.status(500).json({ message: 'Error al enviar la notificación' });
    }
});

// Ruta para enviar notificación a múltiples usuarios
router.post('/send-to-many', authMiddleware, async (req, res) => {
    try {
        // Verificar que el usuario sea administrador
        const adminUser = await User.findById(req.user.userId);
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({ message: 'No tienes permisos para enviar notificaciones' });
        }

        const { userIds, title, body, icon, badge, data } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'Debes proporcionar un array de userIds' });
        }

        if (!title || !body) {
            return res.status(400).json({ message: 'Datos incompletos. Se requieren title y body' });
        }

        const payload = JSON.stringify({
            title,
            body,
            icon: icon || '/lira.png',
            badge: badge || '/lira.png',
            data: data || {},
        });

        const results = [];
        let totalSubscriptions = 0;
        let successCount = 0;

        for (const userId of userIds) {
            const subscriptions = await Subscription.find({ userId });
            totalSubscriptions += subscriptions.length;

            // Enviar notificaciones web
            for (const subscription of subscriptions) {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: subscription.endpoint,
                            keys: {
                                p256dh: subscription.keys.p256dh,
                                auth: subscription.keys.auth,
                            },
                        },
                        payload
                    );
                    successCount++;
                    results.push({ success: true, userId, type: 'web', endpoint: subscription.endpoint });
                } catch (error) {
                    console.error('Error al enviar notificación web:', error);
                    // Si la suscripción es inválida, eliminarla
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        await Subscription.findByIdAndDelete(subscription._id);
                    }
                    results.push({ success: false, userId, type: 'web', endpoint: subscription.endpoint, error: error.message });
                }
            }
        }

        res.json({
            message: `Notificación enviada a ${successCount} de ${totalSubscriptions} dispositivos de ${userIds.length} usuarios`,
            results,
        });
    } catch (error) {
        console.error('Error al enviar notificaciones:', error);
        res.status(500).json({ message: 'Error al enviar las notificaciones' });
    }
});

// Ruta para obtener usuarios con suscripciones (para el admin)
router.get('/users-with-subscriptions', authMiddleware, async (req, res) => {
    try {
        // Verificar que el usuario sea administrador
        const adminUser = await User.findById(req.user.userId);
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({ message: 'No tienes permisos para ver esta información' });
        }

        const subscriptions = await Subscription.find().populate('userId', 'correo nombre role');
        const usersMap = new Map();

        subscriptions.forEach(sub => {
            if (sub.userId) {
                const userId = sub.userId._id.toString();
                if (!usersMap.has(userId)) {
                    usersMap.set(userId, {
                        _id: userId,
                        correo: sub.userId.correo,
                        nombre: sub.userId.nombre,
                        role: sub.userId.role,
                        subscriptionCount: 0,
                    });
                }
                usersMap.get(userId).subscriptionCount++;
            }
        });

        const users = Array.from(usersMap.values());
        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios con suscripciones:', error);
        res.status(500).json({ message: 'Error al obtener usuarios con suscripciones' });
    }
});

// Ruta para obtener todos los usuarios (para selección en el admin)
router.get('/all-users', authMiddleware, async (req, res) => {
    try {
        // Verificar que el usuario sea administrador
        const adminUser = await User.findById(req.user.userId);
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({ message: 'No tienes permisos para ver esta información' });
        }

        const users = await User.find({}, 'correo nombre role');
        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
});


module.exports = router;

