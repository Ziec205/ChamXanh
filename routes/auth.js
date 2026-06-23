const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Thiếu thông tin' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email đã tồn tại' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword, name });

    const token = jwt.sign({ id: user._id, email: user.email, name: user.name, isAdmin: false }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Thiếu thông tin' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    if (!user.active) return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

    const token = jwt.sign({ id: user._id, email: user.email, name: user.name, isAdmin: false }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
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

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.json({ user: req.user });
    res.json({ user: { id: user._id, email: user.email, name: user.name, active: user.active } });
  } catch (e) {
    res.json({ user: req.user });
  }
});

module.exports = router;
