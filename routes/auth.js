const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readDB, writeDB } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Thiếu thông tin' });

    const db = readDB();
    if (db.users.find((u) => u.email === email)) return res.status(400).json({ error: 'Email đã tồn tại' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      createdAt: new Date().toISOString(),
      active: true,
    };
    db.users.push(user);
    writeDB(db);

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, isAdmin: false }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Thiếu thông tin' });

    const db = readDB();
    const user = db.users.find((u) => u.email === email);
    if (!user) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    if (!user.active) return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, isAdmin: false }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ email, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { email, isAdmin: true } });
    }
    res.status(401).json({ error: 'Sai thông tin admin' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  const db = readDB();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.json({ user: req.user });
  res.json({ user: { id: user.id, email: user.email, name: user.name, active: user.active } });
});

module.exports = router;
