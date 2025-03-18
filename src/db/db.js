const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB conectado");

    // Mantener la conexión activa enviando un ping cada 10 segundos
    setInterval(() => {
      mongoose.connection.db.command({ ping: 1 })
        .then(() => {
          console.log("Ping exitoso a MongoDB");
        })
        .catch((error) => {
          console.error("Error en el ping a MongoDB:", error.message);
        });
    }, 100000); 

  } catch (error) {
    console.error("Error al conectar a MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
