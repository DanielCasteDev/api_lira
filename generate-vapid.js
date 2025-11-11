/**
 * Script para generar claves VAPID para WebPush
 * Ejecutar con: node generate-vapid.js
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// Generar claves VAPID
console.log('Generando claves VAPID...');
const vapidKeys = webpush.generateVAPIDKeys();

// Crear objeto con las claves
const vapidData = {
  publicKey: vapidKeys.publicKey,
  privateKey: vapidKeys.privateKey
};

// Guardar en archivo JSON
const filePath = path.join(__dirname, 'vapid-keys.json');

// Verificar si el archivo ya existe
if (fs.existsSync(filePath)) {
  console.warn('⚠️  El archivo vapid-keys.json ya existe.');
  console.warn('⚠️  Se sobrescribirá con las nuevas claves.');
  console.warn('⚠️  Esto invalidará todas las suscripciones existentes.');
  console.log('\n¿Deseas continuar? (S/N)');
  console.log('Nota: En producción, esto requiere confirmación manual.');
}

// Guardar las claves
fs.writeFileSync(filePath, JSON.stringify(vapidData, null, 2));

console.log('\n✅ Claves VAPID generadas y guardadas en vapid-keys.json');
console.log('\n📋 Public Key:');
console.log(vapidKeys.publicKey);
console.log('\n🔒 Private Key:');
console.log(vapidKeys.privateKey);
console.log('\n⚠️  IMPORTANTE:');
console.log('   - Nunca compartas la clave privada');
console.log('   - No commits este archivo en el repositorio (agrégalo a .gitignore)');
console.log('   - Guarda estas claves de forma segura');

