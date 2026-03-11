import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { upload } from '../middleware/uploadMiddleware';
import { validate } from '../middleware/validate';
import { uploadFileSchema, fileIdParamSchema, channelFilesSchema } from '../validators/file.validator';
import {
    uploadFile,
    getFileInfo,
    downloadFile,
    getPresignedUrlHandler,
    deleteFile,
    getChannelFiles,
} from '../controllers/file.controller';
import { uploadRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/files/upload — Upload a file
router.post('/upload', uploadRateLimiter, upload.single('file'), validate(uploadFileSchema), uploadFile);

// GET /api/files/channel/:channelId — List files in a channel (paginated)
router.get('/channel/:channelId', validate(channelFilesSchema), getChannelFiles);

// GET /api/files/:fileId — Get file metadata
router.get('/:fileId', validate(fileIdParamSchema), getFileInfo);

// GET /api/files/:fileId/download — Stream file to client
router.get('/:fileId/download', validate(fileIdParamSchema), downloadFile);

// GET /api/files/:fileId/presigned — Get presigned URL (15 min)
router.get('/:fileId/presigned', validate(fileIdParamSchema), getPresignedUrlHandler);

// DELETE /api/files/:fileId — Delete file (uploader only)
router.delete('/:fileId', validate(fileIdParamSchema), deleteFile);

export default router;
