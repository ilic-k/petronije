const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');

const db = require('./db/init');
const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = process.env.DB_PATH || path.join(__dirname, 'db');
const uploadDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Dozvoljene su samo slike'));
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// In-memory token store { token: expiresAt }
const tokens = new Map();

function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, exp] of tokens) {
    if (now > exp) tokens.delete(token);
  }
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Neautorizovan pristup' });
  }
  const token = auth.slice(7);
  cleanExpiredTokens();
  if (!tokens.has(token)) {
    return res.status(401).json({ error: 'Sesija istekla, prijavite se ponovo' });
  }
  next();
}

// ─── Public API ────────────────────────────────────────────────────────────────

// GET /api/parts?marka=VW&model=Golf+6
app.get('/api/parts', (req, res) => {
  const { marka, model } = req.query;
  let query = 'SELECT * FROM parts WHERE 1=1';
  const params = [];

  if (marka && marka !== 'sve') {
    query += ' AND marka = ?';
    params.push(marka);
  }
  if (model && model !== 'sve') {
    query += ' AND model = ?';
    params.push(model);
  }

  query += ' ORDER BY created_at DESC';

  const parts = db.prepare(query).all(...params);
  res.json(parts);
});

// GET /api/models — all distinct VW models
app.get('/api/models', (req, res) => {
  const rows = db.prepare(
    'SELECT DISTINCT model FROM parts ORDER BY model'
  ).all();
  res.json(rows.map(r => r.model));
});

// GET /api/brands — all brands with their models
app.get('/api/brands', (req, res) => {
  const rows = db.prepare(
    'SELECT DISTINCT marka, model FROM parts ORDER BY marka, model'
  ).all();

  const result = {};
  for (const row of rows) {
    if (!result[row.marka]) result[row.marka] = [];
    if (!result[row.marka].includes(row.model)) {
      result[row.marka].push(row.model);
    }
  }
  res.json(result);
});

// ─── Admin Auth ────────────────────────────────────────────────────────────────

app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Unesite lozinku' });

  const admin = db.prepare('SELECT password_hash FROM admin WHERE id = 1').get();
  if (!admin) return res.status(500).json({ error: 'Admin nije konfigurisan' });

  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) return res.status(401).json({ error: 'Pogrešna lozinka' });

  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, Date.now() + 8 * 60 * 60 * 1000); // 8h
  res.json({ token });
});

app.post('/api/admin/logout', (req, res) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    tokens.delete(auth.slice(7));
  }
  res.json({ ok: true });
});

// ─── Admin Upload ──────────────────────────────────────────────────────────────

app.post('/api/admin/upload', authMiddleware, (req, res) => {
  upload.single('slika')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Greška pri uploadu' });
    }
    if (!req.file) return res.status(400).json({ error: 'Nije priložena slika' });
    res.json({ url: '/uploads/' + req.file.filename });
  });
});

// ─── Admin Parts CRUD ──────────────────────────────────────────────────────────

app.post('/api/admin/parts', authMiddleware, (req, res) => {
  const { naziv, marka, model, cena, opis, slika } = req.body;
  if (!naziv || !marka || !model) {
    return res.status(400).json({ error: 'Naziv, marka i model su obavezni' });
  }

  const result = db.prepare(`
    INSERT INTO parts (naziv, marka, model, cena, opis, slika)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(naziv.trim(), marka.trim(), model.trim(), cena || '', opis || '', slika || '');

  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(part);
});

app.put('/api/admin/parts/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { naziv, marka, model, cena, opis, slika } = req.body;
  if (!naziv || !marka || !model) {
    return res.status(400).json({ error: 'Naziv, marka i model su obavezni' });
  }

  const existing = db.prepare('SELECT id FROM parts WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Deo nije pronađen' });

  db.prepare(`
    UPDATE parts SET naziv=?, marka=?, model=?, cena=?, opis=?, slika=?
    WHERE id=?
  `).run(naziv.trim(), marka.trim(), model.trim(), cena || '', opis || '', slika || '', id);

  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
  res.json(part);
});

app.delete('/api/admin/parts/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT slika FROM parts WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Deo nije pronađen' });

  if (existing.slika) {
    const filename = path.basename(existing.slika);
    const filepath = path.join(uploadDir, filename);
    fs.unlink(filepath, () => {});
  }

  db.prepare('DELETE FROM parts WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ─── Upit za deo ──────────────────────────────────────────────────────────────

app.post('/api/upit', async (req, res) => {
  const { ime, mobil, email, sasija, ulica, mesto, delovi } = req.body;

  if (!ime || !mobil || !delovi) {
    return res.status(400).json({ error: 'Obavezna polja nisu popunjena.' });
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({ error: 'Email nije konfigurisan na serveru.' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const tekst = `
Novi upit za deo — Petronije sajt
===================================

Ime i prezime:  ${ime}
Broj mobilnog:  ${mobil}
Email:          ${email || '—'}
Broj šasije:    ${sasija || '—'}
Ulica i broj:   ${ulica || '—'}
Mesto:          ${mesto || '—'}

Traženi deo/delovi:
${delovi}
  `.trim();

  try {
    await transporter.sendMail({
      from: `"Petronije Sajt" <${process.env.SMTP_USER}>`,
      to: 'petronije202@gmail.com',
      subject: `Upit za deo — ${ime}`,
      text: tekst,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('Greška pri slanju maila:', e.message);
    res.status(500).json({ error: 'Greška pri slanju upita. Pokušajte ponovo.' });
  }
});

// ─── Admin Panel (hidden URL) ──────────────────────────────────────────────────

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ─── Catch-all ─────────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Petronije sajt pokrenut na portu ${PORT}`);
});
