const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, uploadsDir } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const allowedImageTypes = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp']
]);

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === 'logo' ? 'logo_banner_' : file.fieldname === 'logo_standar' ? 'logo_standar_' : 'ttd_';
    cb(null, `${prefix}${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedImageTypes.get(ext) === file.mimetype) {
      cb(null, true);
    } else {
      const error = new Error('Hanya file PNG, JPG, JPEG, atau WEBP yang diperbolehkan.');
      error.code = 'INVALID_IMAGE_TYPE';
      cb(error);
    }
  }
});

// GET /api/pengaturan
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pengaturan = await db.getAsync(`SELECT * FROM pengaturan_perusahaan LIMIT 1`);
    res.json({ success: true, data: pengaturan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/pengaturan
router.put('/', authenticateToken, async (req, res) => {
  try {
    const {
      nama_usaha, alamat, no_hp, email,
      nama_bank, nama_rekening, no_rekening,
      nama_penanda_tangan, jabatan_penanda_tangan,
      tarif_ppn_default, format_nomor_surat, kota_default,
      mode_kop_pdf
    } = req.body;

    await db.runAsync(`
      UPDATE pengaturan_perusahaan SET
        nama_usaha = ?, alamat = ?, no_hp = ?, email = ?,
        nama_bank = ?, nama_rekening = ?, no_rekening = ?,
        nama_penanda_tangan = ?, jabatan_penanda_tangan = ?,
        tarif_ppn_default = ?, format_nomor_surat = ?, kota_default = ?,
        mode_kop_pdf = COALESCE(?, mode_kop_pdf, 'banner'),
        diperbarui_pada = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM pengaturan_perusahaan LIMIT 1)
    `, [
      nama_usaha, alamat, no_hp, email,
      nama_bank, nama_rekening, no_rekening,
      nama_penanda_tangan, jabatan_penanda_tangan,
      tarif_ppn_default !== undefined ? Number(tarif_ppn_default) : 11.0,
      format_nomor_surat || '{NOMOR}/MK/{BULAN_ROMAWI}/{TAHUN}',
      kota_default || 'Banyuwangi',
      mode_kop_pdf
    ]);

    const updated = await db.getAsync(`SELECT * FROM pengaturan_perusahaan LIMIT 1`);
    res.json({ success: true, message: 'Pengaturan berhasil disimpan.', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/pengaturan/logo
router.post('/logo', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file logo yang diunggah.' });
    }

    const current = await db.getAsync(`SELECT logo_path FROM pengaturan_perusahaan LIMIT 1`);
    if (current && current.logo_path) {
      const oldFile = path.join(uploadsDir, path.basename(current.logo_path));
      if (fs.existsSync(oldFile)) {
        try { fs.unlinkSync(oldFile); } catch (e) { /* ignore */ }
      }
    }

    const logoUrl = `/uploads/${req.file.filename}`;
    await db.runAsync(`
      UPDATE pengaturan_perusahaan SET logo_path = ?, diperbarui_pada = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM pengaturan_perusahaan LIMIT 1)
    `, [logoUrl]);

    res.json({ success: true, message: 'Logo berhasil diunggah.', logo_path: logoUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/pengaturan/ttd
router.post('/ttd', authenticateToken, upload.single('ttd'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file tanda tangan yang diunggah.' });
    }

    const current = await db.getAsync(`SELECT ttd_path FROM pengaturan_perusahaan LIMIT 1`);
    if (current && current.ttd_path) {
      const oldFile = path.join(uploadsDir, path.basename(current.ttd_path));
      if (fs.existsSync(oldFile)) {
        try { fs.unlinkSync(oldFile); } catch (e) { /* ignore */ }
      }
    }

    const ttdUrl = `/uploads/${req.file.filename}`;
    await db.runAsync(`
      UPDATE pengaturan_perusahaan SET ttd_path = ?, diperbarui_pada = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM pengaturan_perusahaan LIMIT 1)
    `, [ttdUrl]);

    res.json({ success: true, message: 'Tanda tangan berhasil diunggah.', ttd_path: ttdUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/pengaturan/logo-standar
router.post('/logo-standar', authenticateToken, upload.single('logo_standar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file logo standar yang diunggah.' });
    }

    const current = await db.getAsync(`SELECT logo_standar_path FROM pengaturan_perusahaan LIMIT 1`);
    if (current && current.logo_standar_path) {
      const oldFile = path.join(uploadsDir, path.basename(current.logo_standar_path));
      if (fs.existsSync(oldFile)) {
        try { fs.unlinkSync(oldFile); } catch (e) { /* ignore */ }
      }
    }

    const logoStandarUrl = `/uploads/${req.file.filename}`;
    await db.runAsync(`
      UPDATE pengaturan_perusahaan SET logo_standar_path = ?, diperbarui_pada = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM pengaturan_perusahaan LIMIT 1)
    `, [logoStandarUrl]);

    res.json({ success: true, message: 'Logo standar berhasil diunggah.', logo_standar_path: logoStandarUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Ukuran file gambar maksimal 5 MB.'
    });
  }

  if (err.code === 'INVALID_IMAGE_TYPE') {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'Unggahan gambar tidak valid.'
    });
  }

  next(err);
});

module.exports = router;
