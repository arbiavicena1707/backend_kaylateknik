const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Gagal membuka database SQLite:', err.message);
  } else {
    console.log('Terhubung ke database SQLite di', dbPath);
  }
});

// Helper for promise-based queries
db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function initDb() {
  // Table Pengguna / Users
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS pengguna (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nama TEXT NOT NULL,
      role TEXT DEFAULT 'owner',
      dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table Pengaturan Perusahaan (1 baris)
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS pengaturan_perusahaan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_usaha TEXT NOT NULL,
      alamat TEXT,
      no_hp TEXT,
      email TEXT,
      logo_path TEXT,
      nama_bank TEXT,
      nama_rekening TEXT,
      no_rekening TEXT,
      nama_penanda_tangan TEXT,
      jabatan_penanda_tangan TEXT,
      ttd_path TEXT,
      tarif_ppn_default REAL DEFAULT 11.0,
      format_nomor_surat TEXT DEFAULT 'NNN/MK/{BULAN_ROMAWI}/{TAHUN}',
      kota_default TEXT DEFAULT 'Banyuwangi',
      mode_kop_pdf TEXT DEFAULT 'banner',
      diperbarui_pada DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.runAsync(`ALTER TABLE pengaturan_perusahaan ADD COLUMN mode_kop_pdf TEXT DEFAULT 'banner'`);
  } catch (e) {
    // Column might already exist
  }

  try {
    await db.runAsync(`ALTER TABLE pengaturan_perusahaan ADD COLUMN logo_standar_path TEXT`);
  } catch (e) {
    // Column might already exist
  }

  // Table Template Nota / Penawaran
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS template (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jenis TEXT NOT NULL, -- 'penawaran' atau 'nota'
      nama_template TEXT NOT NULL,
      perihal TEXT,
      kalimat_pembuka TEXT,
      keterangan TEXT, -- JSON array string atau teks baris
      kalimat_penutup TEXT,
      is_default INTEGER DEFAULT 0,
      dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table Master Barang & Jasa
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS barang (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      satuan TEXT NOT NULL,
      harga_satuan REAL NOT NULL,
      tipe TEXT DEFAULT 'barang', -- 'barang' atau 'jasa'
      aktif INTEGER DEFAULT 1,
      dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table Pelanggan (opsional/kontak cepat)
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS pelanggan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      alamat TEXT,
      kontak TEXT,
      dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table Nota
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS nota (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_surat TEXT NOT NULL,
      nomor_urut INTEGER,
      jenis TEXT NOT NULL, -- 'penawaran' atau 'nota'
      template_id INTEGER,
      tanggal TEXT NOT NULL,
      kota TEXT NOT NULL,
      penerima_nama TEXT NOT NULL,
      penerima_alamat TEXT,
      perihal TEXT,
      kalimat_pembuka TEXT,
      keterangan TEXT,
      kalimat_penutup TEXT,
      pakai_ppn INTEGER DEFAULT 1,
      tarif_ppn REAL DEFAULT 11.0,
      harga_include_ppn INTEGER DEFAULT 0,
      subtotal REAL DEFAULT 0,
      nilai_ppn REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      status TEXT DEFAULT 'Draft', -- 'Draft', 'Terkirim', 'Disetujui', 'Ditolak', 'Lunas'
      dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table Item Nota
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS nota_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nota_id INTEGER NOT NULL,
      barang_id INTEGER,
      nama_barang TEXT NOT NULL,
      satuan TEXT NOT NULL,
      qty REAL NOT NULL,
      harga_satuan REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (nota_id) REFERENCES nota(id) ON DELETE CASCADE
    )
  `);

  // Seed default Admin if not exists
  const existingUser = await db.getAsync(`SELECT * FROM pengguna WHERE username = ?`, ['admin']);
  if (!existingUser) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    await db.runAsync(
      `INSERT INTO pengguna (username, password_hash, nama, role) VALUES (?, ?, ?, ?)`,
      ['admin', hash, 'Pemilik Mikayla Teknik', 'owner']
    );
    console.log('Seeded default admin user: admin / admin123');
  }

  // Seed default Pengaturan if not exists
  const existingSettings = await db.getAsync(`SELECT * FROM pengaturan_perusahaan LIMIT 1`);
  if (!existingSettings) {
    await db.runAsync(`
      INSERT INTO pengaturan_perusahaan (
        nama_usaha, alamat, no_hp, email,
        nama_bank, nama_rekening, no_rekening,
        nama_penanda_tangan, jabatan_penanda_tangan,
        tarif_ppn_default, format_nomor_surat, kota_default
      ) VALUES (
        'MIKAYLA TEKNIK',
        'Jl. Raya Jember - Banyuwangi, Kec. Kabat, Kab. Banyuwangi',
        '0812-3456-7890',
        'mikaylateknik@gmail.com',
        'BCA (Bank Central Asia)',
        'MIKAYLA TEKNIK',
        '1800-888-999',
        'Ahmad Hidayat',
        'Pimpinan / Penanggung Jawab Teknis',
        11.0,
        '{NOMOR}/MK/{BULAN_ROMAWI}/{TAHUN}',
        'Banyuwangi'
      )
    `);
    console.log('Seeded default company settings (Mikayla Teknik)');
  }

  // Seed default Templates
  const templateCount = await db.getAsync(`SELECT COUNT(*) as count FROM template`);
  if (templateCount.count === 0) {
    const defaultKeteranganPenawaran = JSON.stringify([
      "Harga di atas sudah termasuk biaya pengiriman dan pemasangan suku cadang.",
      "Masa berlaku penawaran harga ini adalah 14 (empat belas) hari kalender sejak tanggal surat diterbitkan.",
      "Estimasi waktu pelaksanaan pekerjaan adalah 1 - 2 hari kerja setelah persetujuan penawaran.",
      "Pembayaran dapat ditransfer ke rekening resmi kami setelah pekerjaan selesai dan BAST ditandatangani."
    ]);

    await db.runAsync(`
      INSERT INTO template (jenis, nama_template, perihal, kalimat_pembuka, keterangan, kalimat_penutup, is_default)
      VALUES (
        'penawaran',
        'Surat Penawaran Maintenance Genset Hotel',
        'Penawaran Maintenance Genset Hotel',
        'Bersama ini kami mengajukan penawaran harga untuk pelaksanaan pekerjaan pemeliharaan berkala (preventive maintenance) dan penggantian suku cadang Genset, dengan rincian kebutuhan sebagai berikut:',
        ?,
        'Demikian surat penawaran harga ini kami sampaikan. Besar harapan kami untuk dapat menjalin kerjasama yang baik dengan Bapak/Ibu. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.',
        1
      )
    `, [defaultKeteranganPenawaran]);

    const defaultKeteranganNota = JSON.stringify([
      "Barang yang sudah dibeli dan diterima dalam kondisi baik tidak dapat dikembalikan kecuali ada perjanjian sebelumnya.",
      "Pembayaran sah apabila disertai bukti transfer atau kwitansi resmi bermaterai."
    ]);

    await db.runAsync(`
      INSERT INTO template (jenis, nama_template, perihal, kalimat_pembuka, keterangan, kalimat_penutup, is_default)
      VALUES (
        'nota',
        'Nota Penjualan & Jasa Perbaikan',
        'Nota Tagihan Pemeliharaan Genset',
        'Berikut ini kami sampaikan rincian tagihan atas pelaksanaan pekerjaan dan penyediaan suku cadang genset:',
        ?,
        'Terima kasih atas kepercayaan dan kerjasamanya.',
        1
      )
    `, [defaultKeteranganNota]);

    console.log('Seeded default templates');
  }

  // Seed Master Barang
  const barangCount = await db.getAsync(`SELECT COUNT(*) as count FROM barang`);
  if (barangCount.count === 0) {
    const sampleItems = [
      { nama: 'Jasa Preventive Maintenance Genset', satuan: 'Unit', harga: 2500000, tipe: 'jasa' },
      { nama: 'Oli Mesin Meditran S SAE 40', satuan: 'Liter', harga: 45000, tipe: 'barang' },
      { nama: 'Filter Oli Genset', satuan: 'Pcs', harga: 250000, tipe: 'barang' },
      { nama: 'Filter Solar Atas / Bawah', satuan: 'Pcs', harga: 185000, tipe: 'barang' },
      { nama: 'Air Radiator Coolant Heavy Duty', satuan: 'Liter', harga: 35000, tipe: 'barang' },
      { nama: 'Battery / Aki Genset N120 12V 120Ah', satuan: 'Unit', harga: 1850000, tipe: 'barang' },
      { nama: 'Check & Test Load Genset', satuan: 'Pcs', harga: 865000, tipe: 'jasa' },
      { nama: 'Pembersihan Tangki Solar (Flushing)', satuan: 'Paket', harga: 1200000, tipe: 'jasa' }
    ];

    for (const item of sampleItems) {
      await db.runAsync(
        `INSERT INTO barang (nama, satuan, harga_satuan, tipe) VALUES (?, ?, ?, ?)`,
        [item.nama, item.satuan, item.harga, item.tipe]
      );
    }
    console.log('Seeded initial master barang & jasa');
  }

  // Seed sample Nota matching "66/MK/SEP/IX/2024" to verify calculation & test layout
  const notaCount = await db.getAsync(`SELECT COUNT(*) as count FROM nota`);
  if (notaCount.count === 0) {
    // Items totaling 9.700.000
    // Example:
    // 1. Jasa Preventive Maintenance Genset: 2 Unit x 2.500.000 = 5.000.000
    // 2. Battery / Aki N120: 1 Unit x 1.850.000 = 1.850.000
    // 3. Check & Test Load Genset: 2 Pcs x 865.000 = 1.730.000
    // 4. Filter Oli Genset: 2 Pcs x 250.000 = 500.000
    // 5. Filter Solar Atas/Bawah: 2 Pcs x 185.000 = 370.000
    // 6. Air Radiator Coolant: 7 Liter x 35.000 = 250.000 (adjust to reach 9.700.000 exactly)
    // Let's make items exact:
    // Item 1: Jasa Maintenance Genset (2 Unit x 2.500.000 = 5.000.000)
    // Item 2: Battery / Aki Genset N120 (1 Unit x 1.850.000 = 1.850.000)
    // Item 3: Check & Test Load Genset (2 Pcs x 865.000 = 1.730.000) -> mentioned in plan line 42: "2 x 865.000 = 1.730.000"!
    // Item 4: Penggantian Filter & Oli Mesin Genset (1 Paket x 1.120.000 = 1.120.000)
    // Sum = 5.000.000 + 1.850.000 + 1.730.000 + 1.120.000 = 9.700.000 exactly!
    // PPN 11% = 1.067.000
    // Grand Total = 10.767.000
    const template = await db.getAsync(`SELECT * FROM template WHERE jenis = 'penawaran' LIMIT 1`);
    const result = await db.runAsync(`
      INSERT INTO nota (
        nomor_surat, nomor_urut, jenis, template_id, tanggal, kota,
        penerima_nama, penerima_alamat, perihal, kalimat_pembuka, keterangan, kalimat_penutup,
        pakai_ppn, tarif_ppn, harga_include_ppn, subtotal, nilai_ppn, grand_total, status
      ) VALUES (
        '66/MK/SEP/IX/2024',
        66,
        'penawaran',
        ?,
        '30 September 2024',
        'Banyuwangi',
        'Bapak/Ibu Pimpinan',
        'eL Hotel Banyuwangi\\nJl. Raya Jember KM 7, Kabat, Banyuwangi',
        'Penawaran Maintenance Genset Hotel',
        ?,
        ?,
        ?,
        1,
        11.0,
        0,
        9700000,
        1067000,
        10767000,
        'Disetujui'
      )
    `, [
      template ? template.id : 1,
      template ? template.kalimat_pembuka : 'Bersama ini kami mengajukan penawaran...',
      template ? template.keterangan : '[]',
      template ? template.kalimat_penutup : 'Demikian penawaran ini kami sampaikan.'
    ]);

    const notaId = result.lastID;
    const items = [
      { nama: 'Jasa Preventive Maintenance Genset Berkala', satuan: 'Unit', qty: 2, harga: 2500000, subtotal: 5000000 },
      { nama: 'Battery / Aki Genset N120 12V 120Ah', satuan: 'Unit', qty: 1, harga: 1850000, subtotal: 1850000 },
      { nama: 'Check & Test Load Genset', satuan: 'Pcs', qty: 2, harga: 865000, subtotal: 1730000 },
      { nama: 'Paket Filter & Oli Mesin Meditran S SAE 40', satuan: 'Paket', qty: 1, harga: 1120000, subtotal: 1120000 }
    ];

    for (const item of items) {
      await db.runAsync(`
        INSERT INTO nota_item (nota_id, nama_barang, satuan, qty, harga_satuan, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [notaId, item.nama, item.satuan, item.qty, item.harga, item.subtotal]);
    }

    console.log('Seeded sample nota 66/MK/SEP/IX/2024 (Total: 9.700.000, PPN: 1.067.000, Grand: 10.767.000)');
  }
}

module.exports = {
  db,
  initDb,
  uploadsDir
};
