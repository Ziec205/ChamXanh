const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Product = require('../models/Product');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ active: true });
    res.json({ products });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const products = await Product.find();
    res.json({ products });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, price, description, category } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Thiếu tên hoặc giá' });

    const product = await Product.create({
      name,
      price: Number(price),
      description: description || '',
      category: category || 'Cây cảnh',
      image: req.file ? `/uploads/${req.file.filename}` : null,
    });
    res.json({ product });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const update = {};
    const { name, price, description, category, active } = req.body;
    if (name) update.name = name;
    if (price) update.price = Number(price);
    if (description !== undefined) update.description = description;
    if (category) update.category = category;
    if (active !== undefined) update.active = active === 'true';
    if (req.file) update.image = `/uploads/${req.file.filename}`;

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    res.json({ product });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
