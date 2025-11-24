// backend/src/utils/storage.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION;
const S3_PUBLIC = process.env.S3_PUBLIC_URL;
const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads");

let s3Client = null;
let getSignedUrlFn = null;

async function initS3() {
  if (!S3_BUCKET) return;
  // lazy import to avoid forcing AWS SDK in dev
  const { S3Client, PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  s3Client = new S3Client({ region: S3_REGION });
  getSignedUrlFn = async (key, expires = 3600) => {
    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    return getSignedUrl(s3Client, cmd, { expiresIn: expires });
  };
}

// ensure local upload dir exists
async function ensureLocalDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error("Error creating upload directory:", err);
    throw err;
  }
}

/* Upload file (multer file object expected) */
export async function upload(file) {
  if (!file || !file.buffer) throw new Error("Invalid file");
  if (S3_BUCKET) {
    if (!s3Client) await initS3();
    const safeName = (file.originalname || "file").replace(/\s+/g, "_");
    const key = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safeName}`;
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const params = {
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || "application/octet-stream",
      ACL: process.env.S3_ACL || "private"
    };
    await s3Client.send(new PutObjectCommand(params));
    const url = S3_PUBLIC ? `${S3_PUBLIC.replace(/\/$/, "")}/${key}` : `s3://${S3_BUCKET}/${key}`;
    return { url, key };
  } else {
    await ensureLocalDir();
    const safeName = (file.originalname || "file").replace(/\s+/g, "_");
    const key = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safeName}`;
    const filePath = path.join(UPLOAD_DIR, key);
    await fs.writeFile(filePath, file.buffer);
    const url = `/uploads/${key}`; // serve statically or via route
    return { url, key };
  }
}

export async function getSignedUrl(key, expires = 3600) {
  if (S3_BUCKET) {
    if (!getSignedUrlFn) await initS3();
    return getSignedUrlFn(key, expires);
  }
  // local fallback
  return `/uploads/${key}`;
}

export async function downloadStream(key) {
  if (S3_BUCKET) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const res = await s3Client.send(cmd);
    return res.Body;
  } else {
    const filePath = path.join(UPLOAD_DIR, key);
    return fs.readFile(filePath);
  }
}
