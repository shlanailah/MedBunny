# 🐰 MedBunny

*Little Doses, Big Adventures.*

🔗 **Demo langsung:** [med-bunny.vercel.app](https://med-bunny.vercel.app)

---

## 📖 Tentang MedBunny

**MedBunny** adalah website pencatat rutinitas minum obat untuk **anak usia 2–7 tahun**. Banyak orang tua kesulitan mengajak anak minum obat, lupa apakah obat sudah diberikan, atau lelah mencatat manual. MedBunny membantu dengan jadwal, pencatatan dosis, dan maskot **Bunny** yang membuat rutinitas obat terasa lebih menyenangkan bagi anak.

Website ini punya dua sisi:

- 👨‍👩‍👧 **Parent mode** (untuk orang tua/pengasuh): mengatur jadwal obat, mencatat dosis yang sudah diminum, melihat riwayat, dan mengatur akun.
- 🧒 **Kids mode** (untuk anak): bermain bersama Bunny memakai ⭐ bintang yang didapat dari rutinitas minum obat. Tersedia 4 mini-games: *Bunny's Garden*, *Bunny's Style*, *Bunny's Match-Up*, dan *Bunny's Color Hunt*.

### Fitur utama

- **Jadwal obat**: harian, hari tertentu, atau sesuai kebutuhan (*as needed*), dengan hingga 8 jam minum per hari.
- **Pencatatan dosis** dengan konfirmasi **Mark as taken**, status *Recorded / Upcoming / Awaiting / Missed*, dan riwayat yang bisa difilter.
- **Sistem bintang**: setiap dosis yang dikonfirmasi memberi 1 bintang, dan 1 bintang dipakai untuk memulai 1 game. Dosis yang terlewat tidak mengurangi bintang.
- **Pengingat** lewat notifikasi browser.
- **Kids mode terkunci PIN 4 digit**: anak tidak bisa membuka data obat, riwayat, atau pengaturan.
- **Batas waktu bermain** yang bisa diatur orang tua (5–30 menit per sesi).

> ⚕️ MedBunny **bukan pengganti dokter atau apoteker** dan tidak mendiagnosis penyakit atau menentukan dosis. Semua jadwal diisi orang tua sesuai label obat atau petunjuk tenaga kesehatan. Konfirmasi di aplikasi juga tidak membuktikan obat benar-benar diminum.

---

## 🏗️ Arsitektur Singkat

MedBunny adalah satu repositori (monorepo) dengan **frontend React + Vite** dan **backend API berbasis Hono** yang di-deploy ke Vercel.

---

## 🔐 Akun Demo (Vercel)

Gunakan akun berikut untuk mencoba aplikasi yang sudah di-deploy:

| Field    | Nilai                  |
| -------- | ---------------------- |
| Email    | `demouinic@gmail.com`  |
| Password | `demouinic`            |

> ⚠️ Akun ini hanya untuk keperluan demo/penilaian. Jangan gunakan untuk data pribadi atau sensitif.

---

## 🧰 Teknologi

**Frontend**
- React 19
- Vite
- TypeScript
- Tailwind CSS 4

**Backend**
- Hono (folder `server/`)
- Node.js

**Deployment**
- Vercel (multi-service: `web` + `api`)

---

## 📁 Struktur Folder

Frontend berada di **root repositori**, sedangkan backend dipisahkan di folder **`server/`**.

```
MedBunny/
├── public/            # Aset statis frontend (gambar, ikon, dll.)
├── src/               # 🟦 FRONTEND – kode React (komponen, halaman, styles)
├── index.html         # Entry point HTML frontend (Vite)
├── vite.config.ts     # Konfigurasi Vite
├── tsconfig.json      # Konfigurasi TypeScript
├── package.json       # Dependensi & script FRONTEND
├── server/            # 🟩 BACKEND – API (Hono)
│   └── package.json   # Dependensi & script BACKEND
├── vercel.json        # Konfigurasi deployment & routing (web + api)
└── .figma/make/       # Metadata dari Figma Make
```

### Pemisahan Frontend dan Backend

| Bagian   | Lokasi    | Framework | Dependensi            | Keterangan                          |
| -------- | --------- | --------- | --------------------- | ----------------------------------- |
| Frontend | `/` (root) + `src/` | Vite + React | `package.json` di root   | Antarmuka pengguna (UI)             |
| Backend  | `server/` | Hono      | `server/package.json` | REST API, diakses lewat prefix `/api` |

Routing di Vercel (`vercel.json`):

| Path        | Diarahkan ke      |
| ----------- | ----------------- |
| `/api/*`    | Service **api** (backend, `server/`) |
| `/health`   | Service **api** (health check)       |
| `/*`        | Service **web** (frontend)           |

---

## 🚀 Panduan Menjalankan Secara Lokal

## ✅ Prasyarat

- [Node.js](https://nodejs.org/) **v20 atau lebih baru** (disarankan LTS)
- npm (sudah termasuk bersama Node.js)
- Git

Cek versi:

```bash
node -v
npm -v
```

### 1. Clone repositori

```bash
git clone https://github.com/shlanailah/MedBunny.git
cd MedBunny
```

### 2. Jalankan Backend (`server/`)

Buka terminal pertama:

```bash
cd server
npm install
npm run dev
```

Backend akan berjalan di port yang tertera pada terminal (cek output `npm run dev`). Untuk memastikan backend aktif, buka endpoint health check:

```
http://localhost:<PORT>/health
```

### 3. Jalankan Frontend (root)

Buka terminal kedua, dari **root** proyek:

```bash
npm install
npm run dev
```

Buka alamat yang muncul di terminal, umumnya:

```
http://localhost:5173
```

> 💡 Frontend memanggil API lewat path `/api/...`. Jika backend dijalankan di port berbeda saat development lokal, pastikan proxy di `vite.config.ts` mengarah ke port backend tersebut.

### 4. Build untuk produksi (frontend)

```bash
npm run build      # hasil build ada di folder dist/
npm run preview    # pratinjau hasil build
```

---

## 📜 Script yang Tersedia

**Frontend (root)**

| Perintah          | Fungsi                              |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Menjalankan dev server Vite         |
| `npm run build`   | Build produksi                      |
| `npm run preview` | Pratinjau hasil build               |
| `npm run format`  | Merapikan kode dengan oxfmt         |

**Backend (`server/`)**

| Perintah        | Fungsi                       |
| --------------- | ---------------------------- |
| `npm run dev`   | Menjalankan server development |

---

## 👤 Pengembang

Dikembangkan oleh [@shlanailah](https://github.com/shlanailah).
