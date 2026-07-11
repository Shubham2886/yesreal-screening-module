const multer = require('multer');
const path = require('path');

// just staging files on local disk before storageService moves/references
// them. keeping multer config separate from storageService on purpose -
// multer handles the http upload, storageService handles "where does this
// file actually live" (local folder now, S3 bucket later).
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', process.env.LOCAL_UPLOAD_DIR || 'uploads'));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const allowedExt = ['.pdf', '.txt', '.docx'];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExt.includes(ext)) {
    return cb(new Error(`unsupported file type ${ext}, allowed: ${allowedExt.join(', ')}`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5mb, resumes shouldn't be bigger than this
});

module.exports = upload;
