const { Router } = require('express');
const crypto = require('crypto');
const { pool } = require('../db');

const hashPin = pin => crypto.createHash('sha256').update(`porra2026:${pin}`).digest('hex');
const KICKOFF = new Date('2026-06-11T19:00:00Z');

const router = Router();

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.get('/participants', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM participants ORDER BY created_at');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/participants', async (req, res) => {
  const { id, name, pin } = req.body;
  if (!id || !name || !pin) return res.status(400).json({ error: 'id, name and pin required' });
  if (!/^\d{4,6}$/.test(String(pin))) return res.status(400).json({ error: 'PIN must be 4-6 digits' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO participants(id,name,pin_hash) VALUES($1,$2,$3)
       ON CONFLICT(name) DO NOTHING
       RETURNING id, name`,
      [id, name, hashPin(String(pin))]
    );
    if (!rows.length) return res.status(409).json({ error: 'Ese nombre ya está cogido, elige otro' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) return res.status(400).json({ error: 'name and pin required' });
  try {
    const { rows } = await pool.query(
      'SELECT id, name, pin_hash FROM participants WHERE name=$1',
      [name]
    );
    if (!rows.length) return res.status(401).json({ error: 'Nombre o PIN incorrecto' });
    const user = rows[0];
    if (user.pin_hash === '') {
      // Usuario pre-PIN: establece el PIN ahora y entra
      await pool.query('UPDATE participants SET pin_hash=$1 WHERE id=$2', [hashPin(String(pin)), user.id]);
    } else if (user.pin_hash !== hashPin(String(pin))) {
      return res.status(401).json({ error: 'Nombre o PIN incorrecto' });
    }
    res.json({ id: user.id, name: user.name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/pred/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT data FROM predictions WHERE participant_id=$1',
      [req.params.id]
    );
    res.json(rows[0]?.data ?? null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/pred/:id', async (req, res) => {
  if (new Date() >= KICKOFF) return res.status(403).json({ error: 'Las predicciones están cerradas. El torneo ya ha comenzado.' });
  try {
    await pool.query(
      `INSERT INTO predictions(participant_id,data,updated_at) VALUES($1,$2,NOW())
       ON CONFLICT(participant_id) DO UPDATE SET data=$2, updated_at=NOW()`,
      [req.params.id, req.body]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/results', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT data FROM results WHERE id=1');
    res.json(rows[0]?.data ?? null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admin/ping', adminAuth, (req, res) => res.json({ ok: true }));

router.get('/admin/participants', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, created_at FROM participants ORDER BY created_at');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/admin/participants/:id/pin', adminAuth, async (req, res) => {
  const { pin } = req.body;
  if (!pin || !/^\d{4,6}$/.test(String(pin))) return res.status(400).json({ error: 'PIN must be 4-6 digits' });
  try {
    const { rowCount } = await pool.query(
      'UPDATE participants SET pin_hash=$1 WHERE id=$2',
      [hashPin(String(pin)), req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Participant not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.name, pr.data AS pred
      FROM participants p
      LEFT JOIN predictions pr ON pr.participant_id = p.id
      ORDER BY p.created_at
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/results', adminAuth, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO results(id,data,updated_at) VALUES(1,$1,NOW())
       ON CONFLICT(id) DO UPDATE SET data=$1, updated_at=NOW()`,
      [req.body]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/results', adminAuth, async (req, res) => {
  try {
    await pool.query('UPDATE results SET data=NULL, updated_at=NOW() WHERE id=1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
