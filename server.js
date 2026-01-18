const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());
app.use(express.static('public')); // Aquí irá tu HTML

const db = mysql.createConnection({
    host: 'localhost',
    user: 'opomentor', // Cambia esto
    password: 'Lliurex@023097', // Cambia esto
    database: 'opomentor'
});

// Registro de usuario
app.post('/api/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = 'INSERT INTO users (nombre, email, password) VALUES (?, ?, ?)';
    db.query(query, [nombre, email, hashedPassword], (err) => {
        if (err) return res.status(500).send("Error al registrar");
        res.status(201).send("Usuario creado");
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (results.length === 0 || !(await bcrypt.compare(password, results[0].password))) {
            return res.status(401).send("Credenciales incorrectas");
        }
        const token = jwt.sign({ id: results[0].id }, 'TU_CLAVE_SECRETA', { expiresIn: '24h' });
        res.json({ token, user: { nombre: results[0].nombre, plan: results[0].plan_suscripcion } });
    });
});

app.listen(3000, () => console.log('Servidor en puerto 3000'));
