const { Router } = require('express');
const { pool } = require('../db');

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
  const { id, name } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name required' });
  try {
    await pool.query(
      'INSERT INTO participants(id,name) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET name=$2',
      [id, name]
    );
    res.json({ id, name });
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
