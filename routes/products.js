const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', (req, res) => {
  const db = readDB();
  res.json({ products: db.products.filter((p) => p.active !== false) });
});

router.get('/all', authMiddleware, adminMiddleware, (req, res) => {
  const db = readDB();
  res.json({ products: db.products });
});

router.post('/', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
  try {
    const { name, price, description, category } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Thiếu tên hoặc giá' });

    const product = {
      id: uuidv4(),
      name,
      price: Number(price),
      description: description || '',
      category: category || 'Cây cảnh',
      image: req.file ? `/uploads/${req.file.filename}` : null,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const db = readDB();
    db.products.push(product);
    writeDB(db);
    res.json({ product });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
  try {
    const db = readDB();
    const idx = db.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

    const { name, price, description, category, active } = req.body;
    if (name) db.products[idx].name = name;
    if (price) db.products[idx].price = Number(price);
    if (description !== undefined) db.products[idx].description = description;
    if (category) db.products[idx].category = category;
    if (active !== undefined) db.products[idx].active = active === 'true';
    if (req.file) db.products[idx].image = `/uploads/${req.file.filename}`;

    writeDB(db);
    res.json({ product: db.products[idx] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = readDB();
  db.products = db.products.filter((p) => p.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

module.exports = router;
