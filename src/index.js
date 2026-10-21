require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, uploadsDir, dbType } = require('./db');

const authRoutes = require('./routes/auth');
const pengaturanRoutes = require('./routes/pengaturan');
const templateRoutes = require('./routes/template');
const barangRoutes = require('./routes/barang');
const notaRoutes = require('./routes/nota');
const laporanRoutes = require('./routes/laporan');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads (logo, ttd)
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/pengaturan', pengaturanRoutes);
app.use('/api/template', templateRoutes);
app.use('/api/barang', barangRoutes);
app.use('/api/nota', notaRoutes);
app.use('/api/laporan', laporanRoutes);

let dbError = null;

// Health check
app.get('/api/health', (req, res) => {
  if (dbError) {
    return res.status(500).json({
      status: 'error',
      app: 'Aplikasi Nota & Surat Penawaran (Mikayla Teknik)',
      database: dbType,
      database_error: dbError,
      tips: 'Periksa variabel DB_USER, DB_NAME, DB_PASSWORD di cPanel atau file .env.',
      time: new Date().toISOString()
    });
  }

  res.json({
    status: 'ok',
    app: 'Aplikasi Nota & Surat Penawaran (Mikayla Teknik) , 21/10',
    database: dbType,
    time: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal server.'
  });
});

async function start() {
  try {
    await initDb();
    console.log('[Server] Database berhasil diinisialisasi.');
  } catch (err) {
    dbError = err.message || String(err);
    console.error('[Server Error] Gagal inisialisasi database:', dbError);
  }

  // Server tetap berjalan agar TIDAK error 503 di cPanel Passenger
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`Backend Nota & Penawaran berjalan di port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

start();
