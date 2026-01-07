// ============================================
// FILE: server/config/invoiceAttachmentsMulter.js
// ✅ FEATURE #36: Invoice Attachments Upload Config
// ============================================

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads/invoice-attachments';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: invoice-invoiceId-timestamp.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const safeBasename = basename.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    cb(null, `invoice-${req.params.id || 'new'}-${uniqueSuffix}-${safeBasename}${ext}`);
  },
});

// File filter - Allow documents and images
const fileFilter = (req, file, cb) => {
  // Allow documents and images
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  // Check mimetype
  const allowedMimetypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
  ];
  const mimetype = allowedMimetypes.includes(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image and document files are allowed (JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP)'));
  }
};

// Configure multer
const uploadInvoiceAttachments = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10, // Maximum 10 files at once
  },
  fileFilter: fileFilter,
});

export default uploadInvoiceAttachments;