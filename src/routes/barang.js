const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/barang
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { cari, tipe, aktif } = req.query;
    let sql = `SELECT * FROM barang WHERE 1=1`;
    const params = [];

    if (cari) {
      sql += ` AND (nama LIKE ? OR satuan LIKE ?)`;
      params.push(`%${cari}%`, `%${cari}%`);
    }

    if (tipe) {
      sql += ` AND tipe = ?`;
      params.push(tipe);
    }

    if (aktif !== undefined) {
      sql += ` AND aktif = ?`;
      params.push(aktif === '1' || aktif === 'true' ? 1 : 0);
    }

    sql += ` ORDER BY nama ASC`;
    const items = await db.allAsync(sql, params);
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/barang/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await db.getAsync(`SELECT * FROM barang WHERE id = ?`, [req.params.id]);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Barang tidak ditemukan.' });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/barang
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { nama, satuan, harga_satuan, tipe, aktif } = req.body;
    if (!nama || !satuan || harga_satuan === undefined) {
      return res.status(400).json({ success: false, message: 'Nama, satuan, dan harga satuan wajib diisi.' });
    }

    const result = await db.runAsync(`
      INSERT INTO barang (nama, satuan, harga_satuan, tipe, aktif)
      VALUES (?, ?, ?, ?, ?)
    `, [nama, satuan, Number(harga_satuan), tipe || 'barang', aktif !== undefined ? (aktif ? 1 : 0) : 1]);

    const created = await db.getAsync(`SELECT * FROM barang WHERE id = ?`, [result.lastID]);
    res.status(201).json({ success: true, message: 'Barang berhasil ditambahkan.', data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/barang/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { nama, satuan, harga_satuan, tipe, aktif } = req.body;
    await db.runAsync(`
      UPDATE barang SET
        nama = ?, satuan = ?, harga_satuan = ?, tipe = ?, aktif = ?
      WHERE id = ?
    `, [nama, satuan, Number(harga_satuan), tipe, aktif !== undefined ? (aktif ? 1 : 0) : 1, req.params.id]);

    const updated = await db.getAsync(`SELECT * FROM barang WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Barang berhasil diperbarui.', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/barang/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.runAsync(`DELETE FROM barang WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Barang berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
