# FLUX Dashboard

Dashboard untuk memvisualisasikan data dari Notion database FLUX Engagement Growth Tracker.

> App ini **hanya membaca Notion**. Tidak ada scraping di sini.  
> Scraping tetap dihandle oleh FLUX Engagement Growth Tracker (Apify) yang berjalan terjadwal.

---

## Arsitektur

```
[Apify Scraper — berjalan terjadwal]
        ↓
[Notion Databases]
  ├── FLUX Contents          → daftar konten yang dipantau
  ├── FLUX Snapshots         → engagement per konten (views, likes, comments)
  └── FLUX Profile Snapshots → data followers/following
        ↓  (Notion API — read only)
[FLUX Dashboard — app ini]
  ├── /api/engagement    → baca Snapshots + Contents, gabungkan, kirim ke UI
  ├── /api/profile       → baca Profile Snapshots
  └── /api/config-status → cek apakah env vars sudah lengkap
```

---

## Deploy ke Vercel via GitHub

### Langkah 1 — Push ke GitHub

```bash
cd flux-dashboard-fixed
git init
git add .
git commit -m "feat: flux dashboard notion viewer"
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

### Langkah 2 — Import ke Vercel

1. Buka https://vercel.com/new
2. Klik **"Import Git Repository"** → pilih repo yang baru di-push
3. Di bagian **Configure Project**:
   - Framework Preset: **Vite** (biasanya auto-detect)
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Klik **Deploy** (env variables akan diset di langkah berikutnya)

### Langkah 3 — Set Environment Variables di Vercel

Setelah deploy pertama (boleh gagal dulu), masuk ke:  
**Vercel Dashboard → Project → Settings → Environment Variables**

Tambahkan 4 variable berikut:

| Name | Value |
|------|-------|
| `NOTION_API_KEY` | `secret_xxxx...` (dari https://www.notion.so/my-integrations) |
| `NOTION_DB_PROFILE_ID` | 32-char ID database **FLUX Profile Snapshots** |
| `NOTION_DB_CONTENTS_ID` | 32-char ID database **FLUX Contents** |
| `NOTION_DB_SNAPSHOTS_ID` | 32-char ID database **FLUX Snapshots** |

**Cara ambil Database ID dari Notion:**
- Buka database di browser (bukan app)
- URL: `https://notion.so/workspace/`**`← salin 32 karakter ini →`**`?v=xxx`

**Pastikan Integration sudah diinvite ke ketiga database:**
- Di masing-masing database Notion → klik `···` → `Connections` → tambahkan integration

### Langkah 4 — Redeploy

Setelah env variables tersimpan, klik **Redeploy** di tab Deployments.

---

## Jalankan Lokal

```bash
npm install
cp .env.example .env
# → isi .env dengan kredensial Notion
npm run dev
# API  → http://localhost:3001
# UI   → http://localhost:5173
```

---

## Struktur Project

```
flux-dashboard/
├── api/                        ← Vercel Serverless Functions
│   ├── engagement.ts           ← GET /api/engagement
│   ├── profile.ts              ← GET /api/profile
│   └── config-status.ts        ← GET /api/config-status
├── lib/
│   └── notion-engagement.ts    ← Notion client, helpers, queryAll (pagination)
├── src/
│   ├── App.tsx                 ← UI React
│   ├── main.tsx
│   └── index.css
├── server.ts                   ← Express server (local dev saja, tidak dipakai Vercel)
├── vite.config.ts              ← proxy /api → port 3001 saat dev lokal
├── vercel.json                 ← konfigurasi Vercel
├── .env.example
└── package.json
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `/api/engagement` 500 error | Cek env vars di Vercel sudah ter-set, lalu Redeploy |
| "Notion data belum kebaca" | Integration belum di-invite ke database Notion |
| Data hanya muncul sebagian | Sudah handled dengan pagination — pastikan `lib/notion-engagement.ts` versi terbaru |
| Build gagal di Vercel | Pastikan `@vercel/node` ada di devDependencies |
