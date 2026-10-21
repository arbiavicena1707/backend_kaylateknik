const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cek apakah konfigurasi MySQL aktif di .env
const isMySQLConfigured = Boolean(process.env.DB_NAME && process.env.DB_USER);
const dbType = isMySQLConfigured ? 'MySQL (phpMyAdmin)' : 'SQLite';

let db = {};
let pool = null;
let sqliteDb = null;

if (isMySQLConfigured) {
  const mysql = require('mysql2/promise');
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
  });

  db.runAsync = async function (sql, params = []) {
    const [result] = await pool.query(sql, params);
    return {
      lastID: result.insertId,
      changes: result.affectedRows,
      insertId: result.insertId,
      affectedRows: result.affectedRows,
      ...result
    };
  };

  db.getAsync = async function (sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows && rows.length > 0 ? rows[0] : null;
  };

  db.allAsync = async function (sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows || [];
  };
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, '..', 'database.sqlite');
  
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Gagal membuka database SQLite:', err.message);
    } else {
      console.log('[Database] Menggunakan SQLite lokal di', dbPath);
      console.log('[Database] (Tips: Isi DB_USER dan DB_NAME di .env untuk beralih ke MySQL / phpMyAdmin)');
    }
  });

  db.runAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  };

  db.getAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  db.allAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };
}

async function initDb() {
  if (isMySQLConfigured) {
    try {
      const conn = await pool.getConnection();
      console.log(`=======================================================`);
      console.log(`[Database] Terhubung ke MySQL (phpMyAdmin)`);
      console.log(`[Database] Host: ${process.env.DB_HOST || 'localhost'} | DB: ${process.env.DB_NAME}`);
      console.log(`=======================================================`);
      conn.release();
    } catch (err) {
      console.error('[Database Error] Gagal koneksi ke MySQL:', err.message);
      console.error('Pastikan nama database, user, dan password di .env sudah sesuai.');
      throw err;
    }

    // Auto-create MySQL tables if not exist (idempotent)
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS \`pengguna\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(100) NOT NULL UNIQUE,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`nama\` VARCHAR(150) NOT NULL,
        \`role\` VARCHAR(50) DEFAULT 'owner',
        \`dibuat_pada\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS \`pengaturan_perusahaan\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`nama_usaha\` VARCHAR(200) NOT NULL,
        \`alamat\` TEXT,
        \`no_hp\` VARCHAR(50),
        \`email\` VARCHAR(100),
        \`logo_path\` VARCHAR(255),
        \`logo_standar_path\` VARCHAR(255),
        \`nama_bank\` VARCHAR(100),
        \`nama_rekening\` VARCHAR(100),
        \`no_rekening\` VARCHAR(100),
        \`nama_penanda_tangan\` VARCHAR(100),
        \`jabatan_penanda_tangan\` VARCHAR(100),
        \`ttd_path\` VARCHAR(255),
        \`tarif_ppn_default\` DECIMAL(5,2) DEFAULT 11.00,
        \`format_nomor_surat\` VARCHAR(100) DEFAULT '{NOMOR} / MK / {BULAN_SINGKAT} / {BULAN_ROMAWI} / {TAHUN}',
        \`kota_default\` VARCHAR(100) DEFAULT 'Banyuwangi',
        \`mode_kop_pdf\` VARCHAR(50) DEFAULT 'banner',
        \`diperbarui_pada\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS \`template\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`jenis\` VARCHAR(50) NOT NULL,
        \`nama_template\` VARCHAR(200) NOT NULL,
        \`judul_dokumen\` VARCHAR(200),
        \`perihal\` VARCHAR(255),
        \`kalimat_pembuka\` TEXT,
        \`keterangan\` LONGTEXT,
        \`kalimat_penutup\` TEXT,
        \`is_default\` TINYINT(1) DEFAULT 0,
        \`dibuat_pada\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS \`barang\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`nama\` VARCHAR(255) NOT NULL,
        \`satuan\` VARCHAR(50) NOT NULL,
        \`harga_satuan\` DECIMAL(15,2) NOT NULL,
        \`tipe\` VARCHAR(50) DEFAULT 'barang',
        \`aktif\` TINYINT(1) DEFAULT 1,
        \`dibuat_pada\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS \`pelanggan\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`nama\` VARCHAR(200) NOT NULL,
        \`alamat\` TEXT,
        \`kontak\` VARCHAR(100),
        \`dibuat_pada\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS \`nota\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`nomor_surat\` VARCHAR(100) NOT NULL,
        \`nomor_urut\` INT,
        \`jenis\` VARCHAR(50) NOT NULL,
        \`judul_dokumen\` VARCHAR(200),
        \`template_id\` INT,
        \`tanggal\` VARCHAR(100) NOT NULL,
        \`kota\` VARCHAR(100) NOT NULL,
        \`penerima_nama\` VARCHAR(200) NOT NULL,
        \`penerima_alamat\` TEXT,
        \`perihal\` VARCHAR(255),
        \`kalimat_pembuka\` TEXT,
        \`keterangan\` LONGTEXT,
        \`kalimat_penutup\` TEXT,
        \`pakai_ppn\` TINYINT(1) DEFAULT 1,
        \`tarif_ppn\` DECIMAL(5,2) DEFAULT 11.00,
        \`harga_include_ppn\` TINYINT(1) DEFAULT 0,
        \`subtotal\` DECIMAL(15,2) DEFAULT 0.00,
        \`nilai_ppn\` DECIMAL(15,2) DEFAULT 0.00,
        \`grand_total\` DECIMAL(15,2) DEFAULT 0.00,
        \`pakai_dp\` TINYINT(1) DEFAULT 0,
        \`persen_dp\` DECIMAL(5,2) DEFAULT 0.00,
        \`nilai_dp\` DECIMAL(15,2) DEFAULT 0.00,
        \`sisa_pembayaran\` DECIMAL(15,2) DEFAULT 0.00,
        \`status\` VARCHAR(50) DEFAULT 'Draft',
        \`dibuat_pada\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS \`nota_item\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`nota_id\` INT NOT NULL,
        \`barang_id\` INT,
        \`nama_barang\` VARCHAR(255) NOT NULL,
        \`satuan\` VARCHAR(50) NOT NULL,
        \`qty\` DECIMAL(10,2) NOT NULL,
        \`harga_satuan\` DECIMAL(15,2) NOT NULL,
        \`subtotal\` DECIMAL(15,2) NOT NULL,
        INDEX \`idx_nota_id\` (\`nota_id\`),
        CONSTRAINT \`fk_nota_item_nota\` FOREIGN KEY (\`nota_id\`) REFERENCES \`nota\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // MySQL migration: tambah kolom DP jika belum ada (untuk database lama)
    const dpMigrations = [
      `ALTER TABLE \`nota\` ADD COLUMN \`pakai_dp\` TINYINT(1) DEFAULT 0`,
      `ALTER TABLE \`nota\` ADD COLUMN \`persen_dp\` DECIMAL(5,2) DEFAULT 0.00`,
      `ALTER TABLE \`nota\` ADD COLUMN \`nilai_dp\` DECIMAL(15,2) DEFAULT 0.00`,
      `ALTER TABLE \`nota\` ADD COLUMN \`sisa_pembayaran\` DECIMAL(15,2) DEFAULT 0.00`,
    ];
    for (const sql of dpMigrations) {
      try { await db.runAsync(sql); } catch (e) { /* kolom sudah ada, skip */ }
    }

    // Seed default Admin jika tabel kosong
    const existingUser = await db.getAsync(`SELECT * FROM pengguna WHERE username = ?`, ['admin']);
    if (!existingUser) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('admin123', salt);
      await db.runAsync(
        `INSERT INTO pengguna (username, password_hash, nama, role) VALUES (?, ?, ?, ?)`,
        ['admin', hash, 'Pemilik Mikayla Teknik', 'owner']
      );
      console.log('[Seed] Admin default dibuat: admin / admin123');
    }

    // Seed default Pengaturan jika kosong
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
      console.log('[Seed] Pengaturan perusahaan default dibuat');
    }

    return;
  }

  // SQLite Schema Init (Fallback)
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
  } catch (e) {}

  try {
    await db.runAsync(`ALTER TABLE pengaturan_perusahaan ADD COLUMN logo_standar_path TEXT`);
  } catch (e) {}

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS template (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jenis TEXT NOT NULL,
      nama_template TEXT NOT NULL,
      judul_dokumen TEXT,
      perihal TEXT,
      kalimat_pembuka TEXT,
      keterangan TEXT,
      kalimat_penutup TEXT,
      is_default INTEGER DEFAULT 0,
      dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.runAsync(`ALTER TABLE template ADD COLUMN judul_dokumen TEXT`);
  } catch (e) {}

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS barang (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      satuan TEXT NOT NULL,
      harga_satuan REAL NOT NULL,
      tipe TEXT DEFAULT 'barang',
      aktif INTEGER DEFAULT 1,
      dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS pelanggan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      alamat TEXT,
      kontak TEXT,
      dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS nota (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_surat TEXT NOT NULL,
      nomor_urut INTEGER,
      jenis TEXT NOT NULL,
      judul_dokumen TEXT,
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
      pakai_dp INTEGER DEFAULT 0,
      persen_dp REAL DEFAULT 0,
      nilai_dp REAL DEFAULT 0,
      sisa_pembayaran REAL DEFAULT 0,
      status TEXT DEFAULT 'Draft',
      dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.runAsync(`ALTER TABLE nota ADD COLUMN judul_dokumen TEXT`);
  } catch (e) {}

  // DP (Down Payment) columns migration
  try {
    await db.runAsync(`ALTER TABLE nota ADD COLUMN pakai_dp INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await db.runAsync(`ALTER TABLE nota ADD COLUMN persen_dp REAL DEFAULT 0`);
  } catch (e) {}
  try {
    await db.runAsync(`ALTER TABLE nota ADD COLUMN nilai_dp REAL DEFAULT 0`);
  } catch (e) {}
  try {
    await db.runAsync(`ALTER TABLE nota ADD COLUMN sisa_pembayaran REAL DEFAULT 0`);
  } catch (e) {}

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
    console.log('[Seed] Admin default SQLite dibuat: admin / admin123');
  }
}

module.exports = {
  db,
  initDb,
  uploadsDir,
  dbType
};
