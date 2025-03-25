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
const childrenRoutes = require('./src/routes/childrenRoutes'); 
const gmail = require('./src/routes/Gmail'); 

const app = express();
const PORT = process.env.PORT || 4000;

// Conectar a MongoDB
connectDB();

app.use(bodyParser.json());

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static('public'));


//rutas
app.use("/api", authRoutes);
app.use("/api", parentRoutes);
app.use('/api', userRoutes); 
app.use('/api', adminRoutes);
app.use('/api', backupRoutes);
app.use('/api', childrenRoutes);
app.use('/api', gmail);


// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
