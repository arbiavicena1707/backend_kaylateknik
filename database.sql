-- ========================================================
-- Database Schema & Data untuk phpMyAdmin / MySQL (Mikayla Teknik)
-- Dibuat Otomatis dari SQLite
-- ========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+07:00";

-- --------------------------------------------------------
-- Table structure for `pengguna`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `pengguna`;
CREATE TABLE `pengguna` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `nama` VARCHAR(150) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'owner',
  `dibuat_pada` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `pengaturan_perusahaan`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `pengaturan_perusahaan`;
CREATE TABLE `pengaturan_perusahaan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama_usaha` VARCHAR(200) NOT NULL,
  `alamat` TEXT,
  `no_hp` VARCHAR(50),
  `email` VARCHAR(100),
  `logo_path` VARCHAR(255),
  `logo_standar_path` VARCHAR(255),
  `nama_bank` VARCHAR(100),
  `nama_rekening` VARCHAR(100),
  `no_rekening` VARCHAR(100),
  `nama_penanda_tangan` VARCHAR(100),
  `jabatan_penanda_tangan` VARCHAR(100),
  `ttd_path` VARCHAR(255),
  `tarif_ppn_default` DECIMAL(5,2) DEFAULT 11.00,
  `format_nomor_surat` VARCHAR(100) DEFAULT '{NOMOR} / MK / {BULAN_SINGKAT} / {BULAN_ROMAWI} / {TAHUN}',
  `kota_default` VARCHAR(100) DEFAULT 'Banyuwangi',
  `mode_kop_pdf` VARCHAR(50) DEFAULT 'banner',
  `diperbarui_pada` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `template`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `template`;
CREATE TABLE `template` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `jenis` VARCHAR(50) NOT NULL,
  `nama_template` VARCHAR(200) NOT NULL,
  `judul_dokumen` VARCHAR(200),
  `perihal` VARCHAR(255),
  `kalimat_pembuka` TEXT,
  `keterangan` LONGTEXT,
  `kalimat_penutup` TEXT,
  `is_default` TINYINT(1) DEFAULT 0,
  `dibuat_pada` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `barang`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `barang`;
CREATE TABLE `barang` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(255) NOT NULL,
  `satuan` VARCHAR(50) NOT NULL,
  `harga_satuan` DECIMAL(15,2) NOT NULL,
  `tipe` VARCHAR(50) DEFAULT 'barang',
  `aktif` TINYINT(1) DEFAULT 1,
  `dibuat_pada` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `pelanggan`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `pelanggan`;
CREATE TABLE `pelanggan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(200) NOT NULL,
  `alamat` TEXT,
  `kontak` VARCHAR(100),
  `dibuat_pada` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `nota`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `nota`;
CREATE TABLE `nota` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nomor_surat` VARCHAR(100) NOT NULL,
  `nomor_urut` INT,
  `jenis` VARCHAR(50) NOT NULL,
  `judul_dokumen` VARCHAR(200),
  `template_id` INT,
  `tanggal` VARCHAR(100) NOT NULL,
  `kota` VARCHAR(100) NOT NULL,
  `penerima_nama` VARCHAR(200) NOT NULL,
  `penerima_alamat` TEXT,
  `perihal` VARCHAR(255),
  `kalimat_pembuka` TEXT,
  `keterangan` LONGTEXT,
  `kalimat_penutup` TEXT,
  `pakai_ppn` TINYINT(1) DEFAULT 1,
  `tarif_ppn` DECIMAL(5,2) DEFAULT 11.00,
  `harga_include_ppn` TINYINT(1) DEFAULT 0,
  `subtotal` DECIMAL(15,2) DEFAULT 0.00,
  `nilai_ppn` DECIMAL(15,2) DEFAULT 0.00,
  `grand_total` DECIMAL(15,2) DEFAULT 0.00,
  `status` VARCHAR(50) DEFAULT 'Draft',
  `dibuat_pada` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `nota_item`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `nota_item`;
CREATE TABLE `nota_item` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nota_id` INT NOT NULL,
  `barang_id` INT,
  `nama_barang` VARCHAR(255) NOT NULL,
  `satuan` VARCHAR(50) NOT NULL,
  `qty` DECIMAL(10,2) NOT NULL,
  `harga_satuan` DECIMAL(15,2) NOT NULL,
  `subtotal` DECIMAL(15,2) NOT NULL,
  INDEX `idx_nota_id` (`nota_id`),
  CONSTRAINT `fk_nota_item_nota` FOREIGN KEY (`nota_id`) REFERENCES `nota` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Data for table `pengguna` (1 records)
-- --------------------------------------------------------
INSERT INTO `pengguna` (`id`, `username`, `password_hash`, `nama`, `role`, `dibuat_pada`) VALUES (1, 'admin', '$2b$10$9z05CpqweD0WZmy5EXqW0eoDFFMlkaR1Ruoq8z63hXU6sAABi/UfK', 'Pemilik Mikayla Teknik', 'owner', '2026-10-19 03:19:55');

-- --------------------------------------------------------
-- Data for table `pengaturan_perusahaan` (1 records)
-- --------------------------------------------------------
INSERT INTO `pengaturan_perusahaan` (`id`, `nama_usaha`, `alamat`, `no_hp`, `email`, `logo_path`, `nama_bank`, `nama_rekening`, `no_rekening`, `nama_penanda_tangan`, `jabatan_penanda_tangan`, `ttd_path`, `tarif_ppn_default`, `format_nomor_surat`, `kota_default`, `diperbarui_pada`, `mode_kop_pdf`, `logo_standar_path`) VALUES (1, 'MIKAYLA TEHNIK', 'PERUMAHAN VILLA GAJAH MADA BLOK G 12  SINGONEGARAN – BANYUWANGI', '082244180789', 'mikaylateknik@gmail.com', '/uploads/logo_1792387157030.jpg', 'Mandiri', 'Imam Sapi\'i', '1-430-018-752525', 'IMAM SAPI\'I', '', '/uploads/ttd_1792409625625.jpg', 11, '{NOMOR} / MK / {BULAN_SINGKAT} / {BULAN_ROMAWI} / {TAHUN}', 'Banyuwangi', '2026-10-19 11:33:47', 'banner', NULL);

-- --------------------------------------------------------
-- Data for table `template` (2 records)
-- --------------------------------------------------------
INSERT INTO `template` (`id`, `jenis`, `nama_template`, `perihal`, `kalimat_pembuka`, `keterangan`, `kalimat_penutup`, `is_default`, `dibuat_pada`, `judul_dokumen`) VALUES (1, 'penawaran', 'Surat Penawaran Maintenance Genset Hotel', 'Penawaran Maintenance Genset Hotel', 'Bersama ini kami mengajukan Penawaran Maintenance, dengan rincian sebagai berikut :', '[\"Validasi Harga : 1 Minggu dari Surat penawaran ini dibuat ,\",\"Pengerjaan 7 hari setelah terjadi kesepakatan ,\",\"Estimasi Pengerjaan 4 Hari ,\",\"Pembayaran setelah serah terima secara cash atau di tranfer ke :\"]', 'Demikian penawaran ini saya sampaikan , Kami Ucapkan Terima kasih .', 1, '2026-10-19 03:19:55', NULL);
INSERT INTO `template` (`id`, `jenis`, `nama_template`, `perihal`, `kalimat_pembuka`, `keterangan`, `kalimat_penutup`, `is_default`, `dibuat_pada`, `judul_dokumen`) VALUES (2, 'nota', 'Nota Penjualan & Jasa Perbaikan', 'Nota Tagihan Pemeliharaan Genset', 'Berikut ini kami sampaikan rincian tagihan atas pelaksanaan pekerjaan dan penyediaan suku cadang genset:', '[\"Barang yang sudah dibeli dan diterima dalam kondisi baik tidak dapat dikembalikan kecuali ada perjanjian sebelumnya.\",\"Pembayaran sah apabila disertai bukti transfer atau kwitansi resmi bermaterai.\"]', 'Terima kasih atas kepercayaan dan kerjasamanya.', 1, '2026-10-19 03:19:55', NULL);

-- --------------------------------------------------------
-- Data for table `barang` (13 records)
-- --------------------------------------------------------
INSERT INTO `barang` (`id`, `nama`, `satuan`, `harga_satuan`, `tipe`, `aktif`, `dibuat_pada`) VALUES (1, 'Jasa Preventive Maintenance Genset', 'Unit', 2500000, 'jasa', 1, '2026-10-19 03:19:55');
INSERT INTO `barang` (`id`, `nama`, `satuan`, `harga_satuan`, `tipe`, `aktif`, `dibuat_pada`) VALUES (2, 'Oli Mesin Meditran S SAE 40', 'Liter', 45000, 'barang', 1, '2026-10-19 03:19:55');
INSERT INTO `barang` (`id`, `nama`, `satuan`, `harga_satuan`, `tipe`, `aktif`, `dibuat_pada`) VALUES (3, 'Filter Oli Genset', 'Pcs', 250000, 'barang', 1, '2026-10-19 03:19:55');
INSERT INTO `barang` (`id`, `nama`, `satuan`, `harga_satuan`, `tipe`, `aktif`, `dibuat_pada`) VALUES (4, 'Filter Solar Atas / Bawah', 'Pcs', 185000, 'barang', 1, '2026-10-19 03:19:55');
INSERT INTO `barang` (`id`, `nama`, `satuan`, `harga_satuan`, `tipe`, `aktif`, `dibuat_pada`) VALUES (5, 'Air Radiator Coolant Heavy Duty', 'Liter', 35000, 'barang', 1, '2026-10-19 03:19:55');
INSERT INTO `barang` (`id`, `nama`, `satuan`, `harga_satuan`, `tipe`, `aktif`, `dibuat_pada`) VALUES (6, 'Battery / Aki Genset N120 12V 120Ah', 'Unit', 1850000, 'barang', 1, '2026-10-19 03:19:55');
INSERT INTO `barang` (`id`, `nama`, `satuan`, `harga_satuan`, `tipe`, `aktif`, `dibuat_pada`) VALUES (7, 'Check & Test Load Genset', 'Pcs', 865000, 'jasa', 1, '2026-10-19 03:19:55');
INSERT INTO `barang` (`id`, `nama`, `satuan`, `harga_satuan`, `tipe`, `aktif`, `dibuat_pada`) VALUES (8, 'Pembersihan Tangki Solar (Flushing)', 'Paket', 1200000, 'jasa', 1, '2026-10-19 03:19:55');
INSERT INTO `barang` (`id`, `nama`, `satuan`, `harga_satuan`, `tipe`, `aktif`, `dibuat_pada`) VALUES (9, 'Oil Filter', 'Pcs', 865000, 'barang', 1, '2026-10-19 04:04:53');
INSERT INTO `barang` (`id`, `nama`, `satuan`, `harga_satuan`, `tipe`, `aktif`, `dibuat_pada`) VALUES (10, 'Fuel Filter', 'pcs', 450000, 'barang', 1, '2026-10-19 04:04:53');
INSERT INTO `barang` (`id`, `nama`, `satuan`, `harga_satuan`, `tipe`, `aktif`, `dibuat_pada`) VALUES (11, 'Oli', 'Liter', 55000, 'barang', 1, '2026-10-19 04:04:53');
INSERT INTO `barang` (`id`, `nama`, `satuan`, `harga_satuan`, `tipe`, `aktif`, `dibuat_pada`) VALUES (12, 'Saparator', 'Pcs', 550000, 'barang', 1, '2026-10-19 04:04:53');
INSERT INTO `barang` (`id`, `nama`, `satuan`, `harga_satuan`, `tipe`, `aktif`, `dibuat_pada`) VALUES (13, 'Jasa', 'Unit', 1500000, 'jasa', 1, '2026-10-19 04:04:53');

-- --------------------------------------------------------
-- Data for table `nota` (4 records)
-- --------------------------------------------------------
INSERT INTO `nota` (`id`, `nomor_surat`, `nomor_urut`, `jenis`, `template_id`, `tanggal`, `kota`, `penerima_nama`, `penerima_alamat`, `perihal`, `kalimat_pembuka`, `keterangan`, `kalimat_penutup`, `pakai_ppn`, `tarif_ppn`, `harga_include_ppn`, `subtotal`, `nilai_ppn`, `grand_total`, `status`, `dibuat_pada`, `judul_dokumen`) VALUES (1, '66 / M K / S E P / I X / 2 0 2 4', 66, 'penawaran', 1, '30 September 2024', 'Banyuwangi', 'Bapak / Ibu Pimpinan', 'eL Hotel\\nBanyuwangi', 'Penawaran Maintenance Genset Hotel', 'Bersama ini kami mengajukan Penawaran Maintenance 2 Unit Genset Hotel , dengan rincian sebagai berikut :', '[\"Validasi Harga : 1 Minggu dari Surat penawaran ini dibuat ,\",\"Pengerjaan 7 hari setelah terjadi kesepakatan ,\",\"Estimasi Pengerjaan 4 Hari ,\",\"Pembayaran setelah serah terima secara cash atau di tranfer ke :\"]', 'Demikian penawaran ini saya sampaikan , Kami Ucapkan Terima kasih .', 1, 11, 0, 9700000, 1067000, 10767000, 'Disetujui', '2026-10-19 03:19:55', NULL);
INSERT INTO `nota` (`id`, `nomor_surat`, `nomor_urut`, `jenis`, `template_id`, `tanggal`, `kota`, `penerima_nama`, `penerima_alamat`, `perihal`, `kalimat_pembuka`, `keterangan`, `kalimat_penutup`, `pakai_ppn`, `tarif_ppn`, `harga_include_ppn`, `subtotal`, `nilai_ppn`, `grand_total`, `status`, `dibuat_pada`, `judul_dokumen`) VALUES (2, '67 / MK / OKT / X / 2026', NULL, 'penawaran', 1, '19 Oktober 2026', 'Banyuwangi', 'El royale', 'Jalan jalan', 'Penawaran Maintenance Genset Hotel', 'Bersama ini kami mengajukan Penawaran Maintenance 2 Unit Genset Hotel , dengan rincian sebagai berikut :', '[\"Validasi Harga : 1 Minggu dari Surat penawaran ini dibuat ,\",\"Pengerjaan 7 hari setelah terjadi kesepakatan ,\",\"Estimasi Pengerjaan 4 Hari ,\",\"Pembayaran setelah serah terima secara cash atau di tranfer ke :\"]', 'Demikian penawaran ini saya sampaikan , Kami Ucapkan Terima kasih .', 1, 11, 1, 35000, 3468, 35000, 'Draft', '2026-10-19 04:31:56', NULL);
INSERT INTO `nota` (`id`, `nomor_surat`, `nomor_urut`, `jenis`, `template_id`, `tanggal`, `kota`, `penerima_nama`, `penerima_alamat`, `perihal`, `kalimat_pembuka`, `keterangan`, `kalimat_penutup`, `pakai_ppn`, `tarif_ppn`, `harga_include_ppn`, `subtotal`, `nilai_ppn`, `grand_total`, `status`, `dibuat_pada`, `judul_dokumen`) VALUES (3, '67 / MK / OKT / X / 2026', NULL, 'nota', 2, '19 Oktober 2026', 'Banyuwangi', 'makan', 'bakso', 'Nota Tagihan Pemeliharaan Genset', 'Berikut ini kami sampaikan rincian tagihan atas pelaksanaan pekerjaan dan penyediaan suku cadang genset:', '[\"Barang yang sudah dibeli dan diterima dalam kondisi baik tidak dapat dikembalikan kecuali ada perjanjian sebelumnya.\",\"Pembayaran sah apabila disertai bukti transfer atau kwitansi resmi bermaterai.\"]', 'Terima kasih atas kepercayaan dan kerjasamanya.', 1, 11, 0, 1850000, 203500, 2053500, 'Disetujui', '2026-10-19 04:33:10', NULL);
INSERT INTO `nota` (`id`, `nomor_surat`, `nomor_urut`, `jenis`, `template_id`, `tanggal`, `kota`, `penerima_nama`, `penerima_alamat`, `perihal`, `kalimat_pembuka`, `keterangan`, `kalimat_penutup`, `pakai_ppn`, `tarif_ppn`, `harga_include_ppn`, `subtotal`, `nilai_ppn`, `grand_total`, `status`, `dibuat_pada`, `judul_dokumen`) VALUES (4, '67 / MK / OKT / X / 2026', NULL, 'penawaran', 1, '19 Oktober 2026', 'Banyuwangi', 'ibu', '', 'Penawaran Maintenance Genset Hotel', 'Bersama ini kami mengajukan Penawaran Maintenance, dengan rincian sebagai berikut :', '[\"Validasi Harga : 1 Minggu dari Surat penawaran ini dibuat ,\",\"Pengerjaan 7 hari setelah terjadi kesepakatan ,\",\"Estimasi Pengerjaan 4 Hari ,\",\"Pembayaran setelah serah terima secara cash atau di tranfer ke :\"]', 'Demikian penawaran ini saya sampaikan , Kami Ucapkan Terima kasih .', 1, 11, 0, 875000, 96250, 971250, 'Draft', '2026-10-19 11:30:17', 'SURAT PENAWARAN HARGA 213');

-- --------------------------------------------------------
-- Data for table `nota_item` (9 records)
-- --------------------------------------------------------
INSERT INTO `nota_item` (`id`, `nota_id`, `barang_id`, `nama_barang`, `satuan`, `qty`, `harga_satuan`, `subtotal`) VALUES (5, 1, NULL, 'Oil Filter', 'Pcs', 2, 865000, 1730000);
INSERT INTO `nota_item` (`id`, `nota_id`, `barang_id`, `nama_barang`, `satuan`, `qty`, `harga_satuan`, `subtotal`) VALUES (6, 1, NULL, 'Fuel Filter', 'pcs', 2, 450000, 900000);
INSERT INTO `nota_item` (`id`, `nota_id`, `barang_id`, `nama_barang`, `satuan`, `qty`, `harga_satuan`, `subtotal`) VALUES (7, 1, NULL, 'Oli', 'Liter', 54, 55000, 2970000);
INSERT INTO `nota_item` (`id`, `nota_id`, `barang_id`, `nama_barang`, `satuan`, `qty`, `harga_satuan`, `subtotal`) VALUES (8, 1, NULL, 'Saparator', 'Pcs', 2, 550000, 1100000);
INSERT INTO `nota_item` (`id`, `nota_id`, `barang_id`, `nama_barang`, `satuan`, `qty`, `harga_satuan`, `subtotal`) VALUES (9, 1, NULL, 'Jasa', 'Unit', 2, 1500000, 3000000);
INSERT INTO `nota_item` (`id`, `nota_id`, `barang_id`, `nama_barang`, `satuan`, `qty`, `harga_satuan`, `subtotal`) VALUES (11, 2, 5, 'Air Radiator Coolant Heavy Duty', 'Liter', 1, 35000, 35000);
INSERT INTO `nota_item` (`id`, `nota_id`, `barang_id`, `nama_barang`, `satuan`, `qty`, `harga_satuan`, `subtotal`) VALUES (14, 3, 6, 'Battery / Aki Genset N120 12V 120Ah', 'Unit', 1, 1850000, 1850000);
INSERT INTO `nota_item` (`id`, `nota_id`, `barang_id`, `nama_barang`, `satuan`, `qty`, `harga_satuan`, `subtotal`) VALUES (19, 4, 7, 'Check & Test Load Genset', 'Pcs', 1, 865000, 865000);
INSERT INTO `nota_item` (`id`, `nota_id`, `barang_id`, `nama_barang`, `satuan`, `qty`, `harga_satuan`, `subtotal`) VALUES (20, 4, NULL, 'Bakso', 'Unit', 1, 10000, 10000);

SET FOREIGN_KEY_CHECKS = 1;
