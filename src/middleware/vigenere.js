function cifradoVigenere(texto, clave, cifrar = true) {
  let resultado = '';
  for (let i = 0, j = 0; i < texto.length; i++) {
      const caracter = texto[i];
      if (caracter.match(/[a-zA-Z]/)) {
          const offset = caracter === caracter.toUpperCase() ? 'A'.charCodeAt(0) : 'a'.charCodeAt(0);
          const claveChar = clave[j % clave.length].toUpperCase();
          const claveOffset = 'A'.charCodeAt(0);
          const desplazamiento = cifrar ? (claveChar.charCodeAt(0) - claveOffset) : -(claveChar.charCodeAt(0) - claveOffset);
          resultado += String.fromCharCode(((caracter.charCodeAt(0) - offset + desplazamiento + 26) % 26 + offset));
          j++;
      } else {
          resultado += caracter;
      }
  }
  return resultado;
}

function cifrarContraseña(req, res, next) {
  const { contraseña } = req.body;
  if (!contraseña) {
      return res.status(400).json({ error: 'La contraseña es obligatoria' });
  }
  const clave = 'claveSecreta'; // Clave fija para el cifrado
  req.contraseñaCifrada = cifradoVigenere(contraseña, clave, true);
  next();
}

// Exportar ambas funciones
module.exports = {
  cifradoVigenere,
  cifrarContraseña,
};