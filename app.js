const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const User = require('./models/User');
const File = require('./models/File');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Atlas Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ Connected to MongoDB Atlas");
}).catch((err) => {
  console.error("❌ MongoDB connection error:", err);
});

app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'driveapp',
  resave: false,
  saveUninitialized: false
}));

app.set('view engine', 'ejs');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Middleware to protect routes
const isLoggedIn = (req, res, next) => {
  if (!req.session.userId) return res.redirect('/login');
  next();
};

// Routes
app.get('/', (req, res) => res.redirect('/login'));

app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    await User.create({ username, password: hashed });
    res.redirect('/login');
  } catch (err) {
    res.send('Username already exists.');
  }
});

app.get('/login', (req, res) => res.render('login'));

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id;
    req.session.username = user.username;
    return res.redirect('/dashboard');
  }
  res.send('Invalid credentials.');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/dashboard', isLoggedIn, async (req, res) => {
  const files = await File.find({ userId: req.session.userId });
  res.render('dashboard', { username: req.session.username, files });
});

app.post('/upload', isLoggedIn, upload.single('file'), async (req, res) => {
  await File.create({
    originalName: req.file.originalname,
    filename: req.file.filename,
    userId: req.session.userId
  });
  res.redirect('/dashboard');
});

app.get('/download/:filename', isLoggedIn, async (req, res) => {
  const file = await File.findOne({ filename: req.params.filename, userId: req.session.userId });
  if (file) {
    return res.download(path.join(__dirname, 'uploads', file.filename), file.originalName);
  }
  res.status(404).send('File not found');
});

app.get('/delete/:id', isLoggedIn, async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, userId: req.session.userId });
  if (file) {
    fs.unlinkSync(path.join(__dirname, 'uploads', file.filename));
    await file.deleteOne();
  }
  res.redirect('/dashboard');
});

app.listen(PORT, () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`);
});
