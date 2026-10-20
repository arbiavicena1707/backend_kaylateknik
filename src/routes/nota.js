const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generateNotaPDF } = require('../services/pdf');

const ROMAN_MONTHS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const MONTH_NAMES_ID = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

async function generateNextNomorSurat(formatTemplate) {
  const now = new Date();
  const year = now.getFullYear();
  const monthIdx = now.getMonth() + 1;
  const romanMonth = ROMAN_MONTHS[monthIdx];
  const monthAbbr = MONTH_NAMES_ID[now.getMonth()];

  // Get max nomor urut for current year or overall
  const row = await db.getAsync(`SELECT MAX(nomor_urut) as max_urut FROM nota`);
  const nextUrut = (row && row.max_urut ? row.max_urut : 0) + 1;

  let nomorStr = formatTemplate || '{NOMOR}/MK/{BULAN_ROMAWI}/{TAHUN}';
  nomorStr = nomorStr
    .replace('{NOMOR}', nextUrut)
    .replace('{BULAN_ROMAWI}', romanMonth)
    .replace('{BULAN_SINGKAT}', monthAbbr)
    .replace('{BULAN}', String(monthIdx).padStart(2, '0'))
    .replace('{TAHUN}', year);

  return { nomor_surat: nomorStr, nomor_urut: nextUrut };
}

function calculateTotals(items, pakai_ppn, tarif_ppn, harga_include_ppn) {
  let subtotal = 0;
  const processedItems = items.map(item => {
    const qty = Number(item.qty) || 0;
    const harga_satuan = Number(item.harga_satuan) || 0;
    const itemSubtotal = Math.round(qty * harga_satuan);
    subtotal += itemSubtotal;
    return {
      ...item,
      qty,
      harga_satuan,
      subtotal: itemSubtotal
    };
  });

  const rate = Number(tarif_ppn) || 11.0;
  let nilai_ppn = 0;
  let grand_total = subtotal;

  if (pakai_ppn) {
    if (harga_include_ppn) {
      // DPP = Total / (1 + rate / 100)
      const dpp = subtotal / (1 + (rate / 100));
      nilai_ppn = Math.round(subtotal - dpp);
      grand_total = subtotal;
    } else {
      nilai_ppn = Math.round(subtotal * (rate / 100));
      grand_total = subtotal + nilai_ppn;
    }
  }

  return {
    items: processedItems,
    subtotal,
    nilai_ppn,
    grand_total
  };
}

// GET /api/nota
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { cari, status, jenis } = req.query;
    let sql = `SELECT * FROM nota WHERE 1=1`;
    const params = [];

    if (cari) {
      sql += ` AND (nomor_surat LIKE ? OR penerima_nama LIKE ? OR perihal LIKE ?)`;
      params.push(`%${cari}%`, `%${cari}%`, `%${cari}%`);
    }

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (jenis) {
      sql += ` AND jenis = ?`;
      params.push(jenis);
    }

    sql += ` ORDER BY id DESC`;
    const notas = await db.allAsync(sql, params);

    for (const nota of notas) {
      nota.items = await db.allAsync(`SELECT * FROM nota_item WHERE nota_id = ? ORDER BY id ASC`, [nota.id]);
    }

    res.json({ success: true, data: notas });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/nota/next-number
router.get('/next-number', authenticateToken, async (req, res) => {
  try {
    const settings = await db.getAsync(`SELECT format_nomor_surat FROM pengaturan_perusahaan LIMIT 1`);
    const format = settings ? settings.format_nomor_surat : '{NOMOR}/MK/{BULAN_ROMAWI}/{TAHUN}';
    const result = await generateNextNomorSurat(format);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/nota/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const nota = await db.getAsync(`
      SELECT n.*, t.judul_dokumen AS template_judul_dokumen
      FROM nota n
      LEFT JOIN template t ON n.template_id = t.id
      WHERE n.id = ?
    `, [req.params.id]);
    if (!nota) {
      return res.status(404).json({ success: false, message: 'Nota tidak ditemukan.' });
    }

    const items = await db.allAsync(`SELECT * FROM nota_item WHERE nota_id = ? ORDER BY id ASC`, [nota.id]);
    res.json({ success: true, data: { ...nota, items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/nota
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      nomor_surat, nomor_urut, jenis, judul_dokumen, template_id, tanggal, kota,
      penerima_nama, penerima_alamat, perihal,
      kalimat_pembuka, keterangan, kalimat_penutup,
      pakai_ppn, tarif_ppn, harga_include_ppn,
      status, items
    } = req.body;

    if (!penerima_nama) {
      return res.status(400).json({ success: false, message: 'Nama penerima wajib diisi.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Item nota minimal harus ada 1.' });
    }

    const settings = await db.getAsync(`SELECT * FROM pengaturan_perusahaan LIMIT 1`);
    let finalNomorSurat = nomor_surat;
    let finalNomorUrut = nomor_urut;

    if (!finalNomorSurat) {
      const generated = await generateNextNomorSurat(settings ? settings.format_nomor_surat : null);
      finalNomorSurat = generated.nomor_surat;
      finalNomorUrut = generated.nomor_urut;
    }

    const isPakaiPpn = pakai_ppn !== undefined ? (pakai_ppn ? 1 : 0) : 1;
    const isInclude = harga_include_ppn !== undefined ? (harga_include_ppn ? 1 : 0) : 0;
    const ratePpn = tarif_ppn !== undefined ? Number(tarif_ppn) : (settings ? settings.tarif_ppn_default : 11.0);

    const calculated = calculateTotals(items, isPakaiPpn, ratePpn, isInclude);

    const keteranganStr = typeof keterangan === 'object' ? JSON.stringify(keterangan) : (keterangan || '[]');

    const notaResult = await db.runAsync(`
      INSERT INTO nota (
        nomor_surat, nomor_urut, jenis, judul_dokumen, template_id, tanggal, kota,
        penerima_nama, penerima_alamat, perihal,
        kalimat_pembuka, keterangan, kalimat_penutup,
        pakai_ppn, tarif_ppn, harga_include_ppn,
        subtotal, nilai_ppn, grand_total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      finalNomorSurat,
      finalNomorUrut || null,
      jenis || 'penawaran',
      judul_dokumen || null,
      template_id || null,
      tanggal || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      kota || (settings ? settings.kota_default : 'Banyuwangi'),
      penerima_nama,
      penerima_alamat || '',
      perihal || '',
      kalimat_pembuka || '',
      keteranganStr,
      kalimat_penutup || '',
      isPakaiPpn,
      ratePpn,
      isInclude,
      calculated.subtotal,
      calculated.nilai_ppn,
      calculated.grand_total,
      status || 'Draft'
    ]);

    const notaId = notaResult.lastID;

    // Insert items
    for (const item of calculated.items) {
      await db.runAsync(`
        INSERT INTO nota_item (nota_id, barang_id, nama_barang, satuan, qty, harga_satuan, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        notaId,
        item.barang_id || null,
        item.nama_barang,
        item.satuan || 'Unit',
        item.qty,
        item.harga_satuan,
        item.subtotal
      ]);
    }

    const createdNota = await db.getAsync(`SELECT * FROM nota WHERE id = ?`, [notaId]);
    const createdItems = await db.allAsync(`SELECT * FROM nota_item WHERE nota_id = ?`, [notaId]);

    res.status(201).json({
      success: true,
      message: 'Nota berhasil dibuat.',
      data: { ...createdNota, items: createdItems }
    });
  } catch (err) {
    console.error('Error create nota:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/nota/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      nomor_surat, jenis, judul_dokumen, template_id, tanggal, kota,
      penerima_nama, penerima_alamat, perihal,
      kalimat_pembuka, keterangan, kalimat_penutup,
      pakai_ppn, tarif_ppn, harga_include_ppn,
      status, items
    } = req.body;

    const existing = await db.getAsync(`SELECT * FROM nota WHERE id = ?`, [req.params.id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Nota tidak ditemukan.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Item nota minimal harus ada 1.' });
    }

    const isPakaiPpn = pakai_ppn !== undefined ? (pakai_ppn ? 1 : 0) : existing.pakai_ppn;
    const isInclude = harga_include_ppn !== undefined ? (harga_include_ppn ? 1 : 0) : existing.harga_include_ppn;
    const ratePpn = tarif_ppn !== undefined ? Number(tarif_ppn) : existing.tarif_ppn;

    const calculated = calculateTotals(items, isPakaiPpn, ratePpn, isInclude);
    const keteranganStr = typeof keterangan === 'object' ? JSON.stringify(keterangan) : (keterangan || existing.keterangan);

    await db.runAsync(`
      UPDATE nota SET
        nomor_surat = ?, jenis = ?, judul_dokumen = ?, template_id = ?, tanggal = ?, kota = ?,
        penerima_nama = ?, penerima_alamat = ?, perihal = ?,
        kalimat_pembuka = ?, keterangan = ?, kalimat_penutup = ?,
        pakai_ppn = ?, tarif_ppn = ?, harga_include_ppn = ?,
        subtotal = ?, nilai_ppn = ?, grand_total = ?, status = ?
      WHERE id = ?
    `, [
      nomor_surat || existing.nomor_surat,
      jenis || existing.jenis,
      judul_dokumen !== undefined ? judul_dokumen : existing.judul_dokumen,
      template_id || existing.template_id,
      tanggal || existing.tanggal,
      kota || existing.kota,
      penerima_nama || existing.penerima_nama,
      penerima_alamat !== undefined ? penerima_alamat : existing.penerima_alamat,
      perihal !== undefined ? perihal : existing.perihal,
      kalimat_pembuka !== undefined ? kalimat_pembuka : existing.kalimat_pembuka,
      keteranganStr,
      kalimat_penutup !== undefined ? kalimat_penutup : existing.kalimat_penutup,
      isPakaiPpn,
      ratePpn,
      isInclude,
      calculated.subtotal,
      calculated.nilai_ppn,
      calculated.grand_total,
      status || existing.status,
      req.params.id
    ]);

    // Replace items
    await db.runAsync(`DELETE FROM nota_item WHERE nota_id = ?`, [req.params.id]);
    for (const item of calculated.items) {
      await db.runAsync(`
        INSERT INTO nota_item (nota_id, barang_id, nama_barang, satuan, qty, harga_satuan, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        req.params.id,
        item.barang_id || null,
        item.nama_barang,
        item.satuan || 'Unit',
        item.qty,
        item.harga_satuan,
        item.subtotal
      ]);
    }

    const updatedNota = await db.getAsync(`SELECT * FROM nota WHERE id = ?`, [req.params.id]);
    const updatedItems = await db.allAsync(`SELECT * FROM nota_item WHERE nota_id = ?`, [req.params.id]);

    res.json({
      success: true,
      message: 'Nota berhasil diperbarui.',
      data: { ...updatedNota, items: updatedItems }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/nota/:id/duplikat
router.post('/:id/duplikat', authenticateToken, async (req, res) => {
  try {
    const original = await db.getAsync(`SELECT * FROM nota WHERE id = ?`, [req.params.id]);
    if (!original) {
      return res.status(404).json({ success: false, message: 'Nota sumber tidak ditemukan.' });
    }

    const items = await db.allAsync(`SELECT * FROM nota_item WHERE nota_id = ?`, [original.id]);
    const settings = await db.getAsync(`SELECT format_nomor_surat, kota_default FROM pengaturan_perusahaan LIMIT 1`);
    const nextNomor = await generateNextNomorSurat(settings ? settings.format_nomor_surat : null);

    const nowFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const insertResult = await db.runAsync(`
      INSERT INTO nota (
        nomor_surat, nomor_urut, jenis, judul_dokumen, template_id, tanggal, kota,
        penerima_nama, penerima_alamat, perihal,
        kalimat_pembuka, keterangan, kalimat_penutup,
        pakai_ppn, tarif_ppn, harga_include_ppn,
        subtotal, nilai_ppn, grand_total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft')
    `, [
      nextNomor.nomor_surat,
      nextNomor.nomor_urut,
      original.jenis,
      original.judul_dokumen || null,
      original.template_id,
      nowFormatted,
      settings ? settings.kota_default : original.kota,
      original.penerima_nama,
      original.penerima_alamat,
      original.perihal,
      original.kalimat_pembuka,
      original.keterangan,
      original.kalimat_penutup,
      original.pakai_ppn,
      original.tarif_ppn,
      original.harga_include_ppn,
      original.subtotal,
      original.nilai_ppn,
      original.grand_total
    ]);

    const newNotaId = insertResult.lastID;
    for (const item of items) {
      await db.runAsync(`
        INSERT INTO nota_item (nota_id, barang_id, nama_barang, satuan, qty, harga_satuan, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [newNotaId, item.barang_id, item.nama_barang, item.satuan, item.qty, item.harga_satuan, item.subtotal]);
    }

    const duplicated = await db.getAsync(`SELECT * FROM nota WHERE id = ?`, [newNotaId]);
    const duplicatedItems = await db.allAsync(`SELECT * FROM nota_item WHERE nota_id = ?`, [newNotaId]);

    res.status(201).json({
      success: true,
      message: 'Nota berhasil diduplikasi.',
      data: { ...duplicated, items: duplicatedItems }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/nota/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.runAsync(`DELETE FROM nota_item WHERE nota_id = ?`, [req.params.id]);
    await db.runAsync(`DELETE FROM nota WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Nota berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/nota/:id/pdf (Download / stream PDF, can be accessed with token or token in query for easy download/sharing)
router.get('/:id/pdf', async (req, res) => {
  try {
    // Check auth from header or query param ?token=...
    let token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
    if (!token && req.query.token) {
      token = req.query.token;
    }

    const nota = await db.getAsync(`
      SELECT n.*, t.judul_dokumen AS template_judul_dokumen
      FROM nota n
      LEFT JOIN template t ON n.template_id = t.id
      WHERE n.id = ?
    `, [req.params.id]);
    if (!nota) {
      return res.status(404).json({ success: false, message: 'Nota tidak ditemukan.' });
    }

    const items = await db.allAsync(`SELECT * FROM nota_item WHERE nota_id = ? ORDER BY id ASC`, [nota.id]);
    const pengaturan = await db.getAsync(`SELECT * FROM pengaturan_perusahaan LIMIT 1`);

    const safeNomor = (nota.nomor_surat || 'nota').replace(/[\/\\:*?"<>|]/g, '_');
    const filename = `${nota.jenis}_${safeNomor}.pdf`;

    const mode = req.query.mode || (pengaturan && pengaturan.mode_kop_pdf) || 'banner';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    await generateNotaPDF(nota, items, pengaturan || {}, res, mode);
  } catch (err) {
    console.error('Error generate PDF:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
});

module.exports = router;
