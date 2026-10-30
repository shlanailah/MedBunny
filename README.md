# 🐰 MedBunny

MedBunny adalah aplikasi web dengan **frontend React + Vite** dan **backend API berbasis Hono**, dalam satu repositori (monorepo) dan di-deploy ke Vercel.

🔗 **Demo langsung:** [med-bunny.vercel.app](https://med-bunny.vercel.app)

---

## 🔐 Akun Demo (Vercel)

Gunakan akun berikut untuk mencoba aplikasi yang sudah di-deploy:

| Field    | Nilai                  |
| -------- | ---------------------- |
| Email    | `demouinic@gmail.com`  |
| Password | `demouinic`            |

> ⚠️ Akun ini hanya untuk keperluan demo. Jangan gunakan untuk data pribadi atau sensitif.

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

## ✅ Prasyarat

- [Node.js](https://nodejs.org/) **v20 atau lebih baru** (disarankan LTS)
- npm (sudah termasuk bersama Node.js)
- Git

Cek versi:

```bash
node -v
npm -v
```

---

## 🚀 Panduan Menjalankan Secara Lokal

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

## ☁️ Deploy ke Vercel

Proyek ini sudah dikonfigurasi sebagai multi-service lewat `vercel.json`:

1. Push repositori ke GitHub.
2. Di [Vercel](https://vercel.com), pilih **Add New → Project**, lalu import repositori `MedBunny`.
3. Biarkan konfigurasi mengikuti `vercel.json` (service `web` untuk frontend dan `api` untuk backend).
4. Tambahkan **Environment Variables** bila dibutuhkan oleh backend (Settings → Environment Variables).
5. Klik **Deploy**.

---

## 🧪 Cara Mencoba Aplikasi (Reviewer)

1. Buka [med-bunny.vercel.app](https://med-bunny.vercel.app).
2. Masuk menggunakan **akun demo** di atas.
3. Jelajahi fitur-fitur aplikasi.

---

## 🛠️ Troubleshooting

| Masalah | Solusi |
| ------- | ------ |
| `npm install` gagal | Pastikan versi Node.js ≥ 20, lalu hapus `node_modules` dan `package-lock.json`, ulangi install |
| Port sudah dipakai | Hentikan proses lain di port tersebut, atau jalankan Vite dengan `npm run dev -- --port 3000` |
| Frontend tidak bisa memanggil API | Pastikan backend (`server/`) sedang berjalan dan proxy/URL API sudah benar |
| Halaman blank setelah deploy | Cek log build di dashboard Vercel dan pastikan environment variable sudah terisi |

---

## 👤 Pengembang

Dikembangkan oleh [@shlanailah](https://github.com/shlanailah).
