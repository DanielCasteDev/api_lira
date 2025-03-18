require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require("./src/db/db");
const authRoutes = require("./src/routes/authRoutes");
const parentRoutes = require("./src/routes/parentRoutes");
const userRoutes = require('./src/routes/userRoutes'); 
const adminRoutes = require('./src/routes/adminRoutes'); 
const backupRoutes = require('./src/routes/backupRoutes'); 

const app = express();
const PORT = process.env.PORT || 4000;

// Conectar a MongoDB
connectDB();

app.use(bodyParser.json());

// Middlewares
app.use(cors());
app.use(express.json());

//rutas
app.use("/api", authRoutes);
app.use("/api", parentRoutes);
app.use('/api', userRoutes); 
app.use('/api', adminRoutes);
app.use('/api', backupRoutes);


// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

