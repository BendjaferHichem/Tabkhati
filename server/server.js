// server/server.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const ingredientsRoutes = require('./routes/ingredients');
const recipesRoutes = require('./routes/recipes');
const recommendationsRoutes = require('./routes/recommendations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- واجهات برمجية (API) ---
app.use('/api/ingredients', ingredientsRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/recommendations', recommendationsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', aiConfigured: Boolean(process.env.GROQ_API_KEY) });
});

// --- الملفات الثابتة (الواجهة الأمامية) ---
app.use(express.static(path.join(__dirname, '..', 'public')));

// أي مسار غير معروف من نوع API يُعاد له خطأ JSON بدلاً من صفحة HTML افتراضية
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'المسار غير موجود.' });
});

app.use((err, req, res, next) => {
  console.error('خطأ غير متوقع:', err);
  res.status(500).json({ error: 'حدث خطأ بسيط في الخادم. حاول مرة أخرى.' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🍳 طبختي يعمل الآن على المنفذ ${PORT} — افتح http://localhost:${PORT}`);
  });
}

module.exports = app;
