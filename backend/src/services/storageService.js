// Small abstraction so the rest of the app doesn't care whether files sit
// on local disk or in an S3 bucket.
const fs = require('fs');
const path = require('path');
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const driver = process.env.STORAGE_DRIVER || 'local';
const localDir = path.join(__dirname, '..', '..', process.env.LOCAL_UPLOAD_DIR || 'uploads');

async function saveLocal(file) {
  // multer already wrote the file to disk, we just return the reference
  // path that gets stored in candidates.resume_file_path
  return {
    key: file.filename,
    path: file.path,
    url: `/uploads/${file.filename}`,
  };
}

async function saveS3(file) {
 //i have to uncomment s3 code and check with s3
  // const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  // const s3 = new S3Client({ region: process.env.AWS_REGION });
  // const key = `resumes/${Date.now()}-${file.originalname}`;
  // await s3.send(new PutObjectCommand({
  //   Bucket: process.env.AWS_S3_BUCKET,
  //   Key: key,
  //   Body: fs.createReadStream(file.path),
  // }));
  // return { key, url: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}` };
  throw new Error('S3 driver not wired up yet, set STORAGE_DRIVER=local or implement saveS3()');
}

async function saveFile(file) {
  if (driver === 's3') return saveS3(file);
  return saveLocal(file);
}

function readTextFromLocalFile(filePath) {
 //Simple text extraction for text uploads
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

async function extractPdfText(filePath) {
    const buffer = fs.readFileSync(filePath);

    const data = await pdfParse(buffer);

    return data.text;
}

async function extractDocxText(filePath) {
    const result = await mammoth.extractRawText({
        path: filePath,
    });

    return result.value;
}

module.exports = { saveFile, readTextFromLocalFile, extractPdfText, extractDocxText, localDir, driver };
