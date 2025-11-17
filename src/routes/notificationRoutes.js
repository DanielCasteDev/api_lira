const express = require('express');
const webpush = require('web-push');
const https = require('https');
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

        if (subscriptions.length === 0) {
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
        
        // Separar suscripciones web y móviles
        const webSubscriptions = subscriptions.filter(sub => sub.type === 'web');
        const mobileSubscriptions = subscriptions.filter(sub => sub.type === 'mobile');

        // Enviar notificaciones web
        for (const subscription of webSubscriptions) {
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

        // Enviar notificaciones móviles vía OneSignal
        if (mobileSubscriptions.length > 0) {
            const playerIds = mobileSubscriptions.map(sub => sub.playerId).filter(id => id);
            if (playerIds.length > 0) {
                try {
                    const oneSignalResult = await sendOneSignalNotification(
                        playerIds,
                        title,
                        body,
                        data || {}
                    );
                    if (oneSignalResult.success) {
                        mobileSubscriptions.forEach(sub => {
                            results.push({ success: true, type: 'mobile', playerId: sub.playerId });
                        });
                    } else {
                        mobileSubscriptions.forEach(sub => {
                            results.push({ success: false, type: 'mobile', playerId: sub.playerId, error: oneSignalResult.error });
                        });
                    }
                } catch (error) {
                    console.error('Error al enviar notificaciones móviles:', error);
                    mobileSubscriptions.forEach(sub => {
                        results.push({ success: false, type: 'mobile', playerId: sub.playerId, error: error.message });
                    });
                }
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
        const allMobilePlayerIds = [];

        for (const userId of userIds) {
            const subscriptions = await Subscription.find({ userId });
            totalSubscriptions += subscriptions.length;

            const webSubscriptions = subscriptions.filter(sub => sub.type === 'web');
            const mobileSubscriptions = subscriptions.filter(sub => sub.type === 'mobile');

            // Enviar notificaciones web
            for (const subscription of webSubscriptions) {
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

            // Recolectar playerIds móviles
            mobileSubscriptions.forEach(sub => {
                if (sub.playerId) {
                    allMobilePlayerIds.push(sub.playerId);
                }
            });
        }

        // Enviar notificaciones móviles en batch
        if (allMobilePlayerIds.length > 0) {
            try {
                const oneSignalResult = await sendOneSignalNotification(
                    allMobilePlayerIds,
                    title,
                    body,
                    data || {}
                );
                if (oneSignalResult.success) {
                    successCount += allMobilePlayerIds.length;
                    allMobilePlayerIds.forEach(playerId => {
                        results.push({ success: true, type: 'mobile', playerId });
                    });
                } else {
                    allMobilePlayerIds.forEach(playerId => {
                        results.push({ success: false, type: 'mobile', playerId, error: oneSignalResult.error });
                    });
                }
            } catch (error) {
                console.error('Error al enviar notificaciones móviles:', error);
                allMobilePlayerIds.forEach(playerId => {
                    results.push({ success: false, type: 'mobile', playerId, error: error.message });
                });
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

// Función helper para enviar notificación vía OneSignal
const sendOneSignalNotification = async (playerIds, title, body, data = {}) => {
    // Credenciales de OneSignal desde variables de entorno
    const ONE_SIGNAL_APP_ID = process.env.ONE_SIGNAL_APP_ID;
    const ONE_SIGNAL_REST_API_KEY = process.env.ONE_SIGNAL_REST_API_KEY;

    if (!ONE_SIGNAL_APP_ID || !ONE_SIGNAL_REST_API_KEY) {
        console.error('❌ OneSignal no está configurado. Verifica las variables de entorno ONE_SIGNAL_APP_ID y ONE_SIGNAL_REST_API_KEY');
        return { success: false, error: 'OneSignal no configurado' };
    }

    try {
        const notification = {
            app_id: ONE_SIGNAL_APP_ID,
            include_player_ids: playerIds,
            headings: { en: title },
            contents: { en: body },
            data: data,
        };

        const options = {
            hostname: 'onesignal.com',
            port: 443,
            path: '/api/v1/notifications',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${ONE_SIGNAL_REST_API_KEY}`, // Formato correcto para OneSignal API
            },
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    try {
                        const result = JSON.parse(responseData);
                        if (res.statusCode === 200) {
                            resolve({ success: true, result });
                        } else {
                            reject({ success: false, error: result });
                        }
                    } catch (e) {
                        reject({ success: false, error: 'Error parsing response' });
                    }
                });
            });

            req.on('error', (error) => {
                reject({ success: false, error: error.message });
            });

            req.write(JSON.stringify(notification));
            req.end();
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Ruta para registrar una suscripción móvil (OneSignal)
router.post('/subscribe-mobile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { playerId, platform } = req.body;

        console.log('📥 [Backend] Recibida solicitud de suscripción móvil:', {
            userId,
            playerId,
            platform,
            timestamp: new Date().toISOString(),
        });

        if (!playerId) {
            return res.status(400).json({ message: 'playerId es requerido' });
        }

        // Buscar o crear la suscripción móvil
        const subscription = await Subscription.findOneAndUpdate(
            { userId, playerId },
            {
                userId,
                playerId,
                type: 'mobile',
                platform: platform || 'android',
            },
            { upsert: true, new: true }
        );

        console.log('✅ [Backend] Suscripción móvil registrada:', {
            userId,
            subscriptionId: subscription._id,
            playerId,
            platform,
        });

        res.status(201).json({
            message: 'Suscripción móvil registrada correctamente',
            subscription: {
                _id: subscription._id,
                userId: subscription.userId,
                playerId: subscription.playerId,
                platform: subscription.platform,
                createdAt: subscription.createdAt,
            },
        });
    } catch (error) {
        console.error('❌ [Backend] Error al registrar suscripción móvil:', error);
        res.status(500).json({ message: 'Error al registrar la suscripción móvil' });
    }
});

// Ruta para eliminar una suscripción móvil
router.post('/unsubscribe-mobile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { playerId } = req.body;

        if (!playerId) {
            return res.status(400).json({ message: 'playerId es requerido' });
        }

        await Subscription.findOneAndDelete({ userId, playerId, type: 'mobile' });

        console.log('✅ [Backend] Suscripción móvil eliminada:', {
            userId,
            playerId,
        });

        res.json({ message: 'Suscripción móvil eliminada correctamente' });
    } catch (error) {
        console.error('❌ [Backend] Error al eliminar suscripción móvil:', error);
        res.status(500).json({ message: 'Error al eliminar la suscripción móvil' });
    }
});

module.exports = router;

