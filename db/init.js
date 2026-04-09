const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const dbDir = process.env.DB_PATH || path.join(__dirname);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'petronije.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    naziv TEXT NOT NULL,
    marka TEXT NOT NULL,
    model TEXT NOT NULL,
    cena TEXT,
    opis TEXT,
    slika TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY,
    password_hash TEXT NOT NULL
  );
`);

// Set admin password
const hash = bcrypt.hashSync('PetronijeFN65!', 10);
db.prepare('INSERT OR REPLACE INTO admin (id, password_hash) VALUES (1, ?)').run(hash);

// Seed parts if table is empty
const count = db.prepare('SELECT COUNT(*) as c FROM parts').get();
if (count.c === 0) {
  const insert = db.prepare(`
    INSERT INTO parts (naziv, marka, model, cena, opis, slika)
    VALUES (@naziv, @marka, @model, @cena, @opis, @slika)
  `);

  const seedParts = [
    // Golf 5
    {
      naziv: 'Poluosovina (leva)',
      marka: 'VW',
      model: 'Golf 5',
      cena: '7.500 RSD',
      opis: 'Leva poluosovina za VW Golf 5 1.4, 1.6 i 2.0 TDI. Reparirana, sa garancijom.',
      slika: ''
    },
    {
      naziv: 'Alternator',
      marka: 'VW',
      model: 'Golf 5',
      cena: '11.000 RSD',
      opis: 'Repariran alternator za Golf 5 1.9 TDI i 2.0 TDI. Ispitan, sa garancijom.',
      slika: ''
    },
    {
      naziv: 'Pumpa za rashladnu tečnost',
      marka: 'VW',
      model: 'Golf 5',
      cena: '3.200 RSD',
      opis: 'Vodena pumpa za VW Golf 5 1.4 TSI i 1.6 FSI. Originalna Bosch.',
      slika: ''
    },
    // Golf 6
    {
      naziv: 'Prednji amortizer',
      marka: 'VW',
      model: 'Golf 6',
      cena: '4.500 RSD',
      opis: 'Originalni prednji amortizer, kompatibilan sa Golf 6 2008-2012. Odlično stanje.',
      slika: ''
    },
    {
      naziv: 'Kočioni disk (prednji)',
      marka: 'VW',
      model: 'Golf 6',
      cena: '3.800 RSD',
      opis: 'Prednji kočioni disk za Golf 6 GTI i 2.0 TDI. Dimenzije 312x25mm.',
      slika: ''
    },
    {
      naziv: 'Termostat sa kućištem',
      marka: 'VW',
      model: 'Golf 6',
      cena: '2.100 RSD',
      opis: 'Termostat sa plastičnim kućištem za Golf 6 1.6 TDI i 2.0 TDI.',
      slika: ''
    },
    // Golf 7
    {
      naziv: 'Filter vazduha',
      marka: 'VW',
      model: 'Golf 7',
      cena: '1.400 RSD',
      opis: 'Filter vazduha za Golf 7 1.4 TSI i 1.6 TDI 2012-2019. Mann filter.',
      slika: ''
    },
    {
      naziv: 'Kočione pločice (prednje)',
      marka: 'VW',
      model: 'Golf 7',
      cena: '3.100 RSD',
      opis: 'Set prednjih kočionih pločica za Golf 7, GTI i R-Line. Brembo.',
      slika: ''
    },
    {
      naziv: 'Svećice (4 kom)',
      marka: 'VW',
      model: 'Golf 7',
      cena: '2.400 RSD',
      opis: 'Set NGK svećica za Golf 7 1.4 TSI i 1.2 TSI benzin. Iridium tip.',
      slika: ''
    },
    // Passat B6
    {
      naziv: 'Kočione pločice (prednje)',
      marka: 'VW',
      model: 'Passat B6',
      cena: '2.800 RSD',
      opis: 'Set prednjih kočionih pločica za Passat B6. Kompatibilno sa 2.0 TDI i 1.8 TSI.',
      slika: ''
    },
    {
      naziv: 'Upravljačka letva (reparirana)',
      marka: 'VW',
      model: 'Passat B6',
      cena: '18.000 RSD',
      opis: 'Reparirana upravljačka letva za Passat B6 sa servo pumpom. Garancija 12 meseci.',
      slika: ''
    },
    {
      naziv: 'EGR ventil',
      marka: 'VW',
      model: 'Passat B6',
      cena: '6.500 RSD',
      opis: 'EGR ventil za Passat B6 2.0 TDI CR motor. Očišćen i ispitan.',
      slika: ''
    },
    // Passat B7
    {
      naziv: 'Zadnji amortizer',
      marka: 'VW',
      model: 'Passat B7',
      cena: '5.800 RSD',
      opis: 'Zadnji amortizer za Passat B7 svi motori 2010-2014. Sachs original.',
      slika: ''
    },
    {
      naziv: 'Filter ulja',
      marka: 'VW',
      model: 'Passat B7',
      cena: '900 RSD',
      opis: 'Filter ulja za Passat B7 2.0 TDI. Mann HU 719/7x.',
      slika: ''
    },
    // Touran
    {
      naziv: 'Filter ulja',
      marka: 'VW',
      model: 'Touran',
      cena: '800 RSD',
      opis: 'Filter ulja za VW Touran 1.9 TDI i 2.0 TDI motore. Original delovi.',
      slika: ''
    },
    {
      naziv: 'Kaiševi distribucije (kit)',
      marka: 'VW',
      model: 'Touran',
      cena: '8.500 RSD',
      opis: 'Komplet kaiša distribucije sa tensioner i vodenom pumpom za Touran 1.9 TDI.',
      slika: ''
    },
    {
      naziv: 'Spona vešanja (prednja)',
      marka: 'VW',
      model: 'Touran',
      cena: '1.600 RSD',
      opis: 'Prednja spona vešanja za Touran 1.6 i 2.0 TDI. Lemförder original.',
      slika: ''
    },
    // Polo
    {
      naziv: 'Hladnjak motora',
      marka: 'VW',
      model: 'Polo 6R',
      cena: '7.200 RSD',
      opis: 'Aluminijumski hladnjak za Polo 6R 1.2 TSI i 1.4 TDI 2009-2017.',
      slika: ''
    },
    {
      naziv: 'Poluosovina (desna)',
      marka: 'VW',
      model: 'Polo 6R',
      cena: '6.800 RSD',
      opis: 'Desna poluosovina za VW Polo 6R 1.2 benzin i 1.6 TDI. Sa garancijom.',
      slika: ''
    },
    // Tiguan
    {
      naziv: 'Prednji amortizer',
      marka: 'VW',
      model: 'Tiguan 1',
      cena: '6.500 RSD',
      opis: 'Prednji amortizer za Tiguan 1 4Motion 2.0 TDI 2007-2016. Bilstein.',
      slika: ''
    },
    {
      naziv: 'Pumpa goriva',
      marka: 'VW',
      model: 'Tiguan 1',
      cena: '9.000 RSD',
      opis: 'Elektropumpa goriva za Tiguan 1 2.0 TSI benzin. Originalna Bosch.',
      slika: ''
    },
    // Caddy
    {
      naziv: 'Kvačilo (komplet)',
      marka: 'VW',
      model: 'Caddy 3',
      cena: '11.500 RSD',
      opis: 'Kompletan set kvačila (disk, koš, ležaj) za Caddy 3 1.6 TDI i 2.0 TDI.',
      slika: ''
    },
    {
      naziv: 'Zadnja kočiona čeljust',
      marka: 'VW',
      model: 'Caddy 3',
      cena: '4.200 RSD',
      opis: 'Zadnja kočiona čeljust za Caddy 3 sa disk kočnicom. Reparirana.',
      slika: ''
    },
    // T5
    {
      naziv: 'Turbina (reparirana)',
      marka: 'VW',
      model: 'T5',
      cena: '22.000 RSD',
      opis: 'Reparirana turbina za VW T5 2.5 TDI i 1.9 TDI. Garancija 12 meseci.',
      slika: ''
    },
    {
      naziv: 'Kočione pločice (prednje + zadnje)',
      marka: 'VW',
      model: 'T5',
      cena: '4.800 RSD',
      opis: 'Komplet prednjih i zadnjih kočionih pločica za T5 svi motori. Ferodo.',
      slika: ''
    },
  ];

  for (const part of seedParts) {
    insert.run(part);
  }
}

module.exports = db;
