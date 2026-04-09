import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadDir = path.resolve(process.cwd(), 'uploads', 'profile-images');

function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    ensureUploadDir();
    callback(null, uploadDir);
  },
  filename: (_request, file, callback) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext || '.png';
    const name = `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    callback(null, name);
  }
});

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

function fileFilter(_request, file, callback) {
  if (!allowedMimeTypes.has(String(file.mimetype || '').toLowerCase())) {
    callback(new Error('Only JPG, PNG, WEBP, and GIF profile images are allowed'));
    return;
  }
  callback(null, true);
}

const profileImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

export { profileImageUpload };
