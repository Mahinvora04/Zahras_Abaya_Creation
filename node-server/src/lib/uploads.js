const fs = require('fs');
const path = require('path');
const multer = require('multer');

function createUploadTools(uploadDir) {
  fs.mkdirSync(uploadDir, { recursive: true });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 8 * 1024 * 1024,
      files: 10,
      fields: 10,
      fieldSize: 10 * 1024,
      parts: 20,
      fieldArrayIndexLimit: 10,
    },
  });

  function deleteImage(url) {
    try {
      const pathname = decodeURIComponent(new URL(url, 'http://local').pathname);
      if (!pathname.startsWith('/uploads/')) return false;

      const relativePath = pathname.slice('/uploads/'.length).replaceAll('/', path.sep);
      if (!relativePath) return false;

      const root = path.resolve(uploadDir);
      const target = path.resolve(root, relativePath);
      const relativeTarget = path.relative(root, target);
      if (!relativeTarget || relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) return false;
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return false;

      fs.unlinkSync(target);
      return true;
    } catch {
      return false;
    }
  }

  function imageExtension(file) {
    const bytes = file.buffer;
    if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return '.jpg';
    if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return '.png';
    if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
      return '.webp';
    }
    return null;
  }

  function saveFile(prefix, file, category = 'products') {
    const extension = imageExtension(file);
    if (!extension) {
      throw Object.assign(new Error('Use a JPG, PNG, or WebP image file'), { status: 400 });
    }

    const allowedCategories = new Set(['products', 'banners', 'categories']);
    if (!allowedCategories.has(category)) {
      throw Object.assign(new Error('Invalid image category'), { status: 400 });
    }

    const categoryDir = path.join(uploadDir, category);
    fs.mkdirSync(categoryDir, { recursive: true });
    let sequence = 1;
    let filename;
    do {
      filename = `${prefix}-${sequence++}${extension}`;
    } while (fs.existsSync(path.join(categoryDir, filename)));

    fs.writeFileSync(path.join(categoryDir, filename), file.buffer, { flag: 'wx' });
    return `${category}/${filename}`;
  }

  return { deleteImage, saveFile, upload };
}

module.exports = { createUploadTools };
