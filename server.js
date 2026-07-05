require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env. Copia .env.example a .env y complétalo.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/operarios', require('./routes/operarios'));
app.use('/api/pagos', require('./routes/pagos'));
app.use('/api/cobros', require('./routes/cobros'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado.' });
});

app.listen(PORT, () => {
  console.log(`Panel de control de operarios escuchando en http://localhost:${PORT}`);
});
