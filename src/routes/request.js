const express = require('express');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const requestController = require('../controllers/request');

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${timestamp}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed'), false);
    }
};

const upload = multer({ 
    storage, 
    fileFilter, 
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', requestController.getAllRequests);
router.get('/by-code/:code', requestController.getRequestByCode);
router.get('/:id', requestController.getRequestById);
router.post('/', upload.single('letterFile'), requestController.createRequest);
router.put('/:id/approve', requestController.approveRequest);
router.put('/:id/reject', requestController.rejectRequest);
router.delete('/:id', requestController.deleteRequest);

module.exports = router;
