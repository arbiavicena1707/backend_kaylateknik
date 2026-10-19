const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/template
router.get('/', authenticateToken, async (req, res) => {
  try {
    const templates = await db.allAsync(`SELECT * FROM template ORDER BY is_default DESC, id ASC`);
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/template/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const template = await db.getAsync(`SELECT * FROM template WHERE id = ?`, [req.params.id]);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template tidak ditemukan.' });
    }
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/template
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { jenis, nama_template, perihal, kalimat_pembuka, keterangan, kalimat_penutup, is_default } = req.body;
    if (!jenis || !nama_template) {
      return res.status(400).json({ success: false, message: 'Jenis dan nama template wajib diisi.' });
    }

    if (is_default) {
      await db.runAsync(`UPDATE template SET is_default = 0 WHERE jenis = ?`, [jenis]);
    }

    const keteranganStr = typeof keterangan === 'object' ? JSON.stringify(keterangan) : (keterangan || '[]');

    const result = await db.runAsync(`
      INSERT INTO template (jenis, nama_template, perihal, kalimat_pembuka, keterangan, kalimat_penutup, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [jenis, nama_template, perihal, kalimat_pembuka, keteranganStr, kalimat_penutup, is_default ? 1 : 0]);

    const created = await db.getAsync(`SELECT * FROM template WHERE id = ?`, [result.lastID]);
    res.status(201).json({ success: true, message: 'Template berhasil ditambahkan.', data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/template/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { jenis, nama_template, perihal, kalimat_pembuka, keterangan, kalimat_penutup, is_default } = req.body;
    
    if (is_default) {
      await db.runAsync(`UPDATE template SET is_default = 0 WHERE jenis = ?`, [jenis]);
    }

    const keteranganStr = typeof keterangan === 'object' ? JSON.stringify(keterangan) : (keterangan || '[]');

    await db.runAsync(`
      UPDATE template SET
        jenis = ?, nama_template = ?, perihal = ?, kalimat_pembuka = ?,
        keterangan = ?, kalimat_penutup = ?, is_default = ?
      WHERE id = ?
    `, [jenis, nama_template, perihal, kalimat_pembuka, keteranganStr, kalimat_penutup, is_default ? 1 : 0, req.params.id]);

    const updated = await db.getAsync(`SELECT * FROM template WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Template berhasil diperbarui.', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/template/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.runAsync(`DELETE FROM template WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Template berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
