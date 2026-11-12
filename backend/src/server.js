import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { notFound, errorHandler } from './middleware/error.js';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, servicio: 'Orígenes SV API' }));

// Carga automática de rutas: routes/<nombre>.routes.js -> /api/<nombre>
// Así cada integrante agrega su archivo sin tocar este archivo (sin conflictos de Git).
const rutasDir = path.join(__dirname, 'routes');
for (const archivo of fs.readdirSync(rutasDir).filter((f) => f.endsWith('.routes.js'))) {
  const nombre = archivo.replace('.routes.js', '');
  const modulo = await import(pathToFileURL(path.join(rutasDir, archivo)).href);
  app.use(`/api/${nombre}`, modulo.default);
  console.log(`Ruta cargada: /api/${nombre}`);
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API Orígenes SV en http://localhost:${PORT}`));