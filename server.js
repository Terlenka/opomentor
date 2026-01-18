require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Servir los archivos de la carpeta public (donde está tu index.html)
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURACIÓN DE CONEXIÓN FORZADA ---
// Usamos los datos de tu imagen como "respaldo" si falla la lectura de .env
const dbConfig = {
    host: process.env.DB_HOST || 'opoo_mysql',
    user: process.env.DB_USER || 'opomentoradmin',
    password: process.env.DB_PASSWORD || 'Lliurex@023097',
    database: process.env.DB_NAME || 'opomentor',
    port: process.env.DB_PORT || 3306,
    connectTimeout: 10000
};

console.log("Intentando conectar a la base de datos en:", dbConfig.host);

const db = mysql.createConnection(dbConfig);

db.connect(err => {
    if (err) {
        console.error('❌ ERROR DE CONEXIÓN:', err.message);
        console.error('Código de error:', err.code);
        console.error('¿Estás usando el host correcto?', dbConfig.host);
    } else {
        console.log('✅ CONEXIÓN EXITOSA: El servidor está unido a la base de datos opoo_mysql');
        
        // --- CREACIÓN AUTOMÁTICA DE TABLAS ---
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100),
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                plan_suscripcion ENUM('gratis', 'basico', 'premium') DEFAULT 'gratis',
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        db.query(createTableQuery, (err) => {
            if (err) console.error("❌ Error creando la tabla users:", err);
            else console.log("✅ Tabla 'users' lista para usar");
        });
    }
});

// --- RUTAS DE LA API ---

// Registro de usuarios
app.post('/api/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (nombre, email, password) VALUES (?, ?, ?)';
        
        db.query(query, [nombre, email, hashedPassword], (err, result) => {
            if (err) {
                console.error("Error en el registro:", err);
                return res.status(500).json({ error: "El email ya existe o hay un error en la BD" });
            }
            res.status(201).json({ message: "Usuario creado correctamente" });
        });
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Login de usuarios
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ error: "Usuario no encontrado" });
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ error: "Contraseña incorrecta" });
        }

        const secret = process.env.JWT_SECRET || 'clave_secreta_provisional_123';
        const token = jwt.sign({ id: user.id }, secret, { expiresIn: '24h' });

        res.json({
            token,
            user: { nombre: user.nombre, plan: user.plan_suscripcion }
        });
    });
});

// Escuchar en el puerto que asigne Easypanel o el 3000 por defecto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor OpoMentor listo en el puerto ${PORT}`);
});
