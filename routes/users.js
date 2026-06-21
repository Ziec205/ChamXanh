const express = require('express');
const { readDB, writeDB } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, adminMiddleware, (req, res) => {
  const db = readDB();
  const users = db.users.map(({ password, ...u }) => u);
  res.json({ users });
});

router.put('/:id/toggle', authMiddleware, adminMiddleware, (req, res) => {
  const db = readDB();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });
  user.active = !user.active;
  writeDB(db);
  res.json({ user: { id: user.id, email: user.email, name: user.name, active: user.active } });
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = readDB();
  db.users = db.users.filter((u) => u.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

module.exports = router;
