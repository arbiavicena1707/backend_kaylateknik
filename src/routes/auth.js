const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    const user = await db.getAsync(`SELECT * FROM pengguna WHERE username = ?`, [username]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, nama: user.nama },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Error saat login:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getAsync(`SELECT id, username, nama, role FROM pengguna WHERE id = ?`, [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/auth/password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { password_lama, password_baru } = req.body;
    const user = await db.getAsync(`SELECT * FROM pengguna WHERE id = ?`, [req.user.id]);
    const isMatch = await bcrypt.compare(password_lama, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Password lama salah.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password_baru, salt);
    await db.runAsync(`UPDATE pengguna SET password_hash = ? WHERE id = ?`, [hash, req.user.id]);

    res.json({ success: true, message: 'Password berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
