import RndDocument from '../models/rnd-document.model';
import { CreateDocumentInput, UpdateDocumentInput } from '../validation/rnd-document.validation';
import { IRndDocumentDocument } from '../types/rnd-document.types';
import { AppError } from '../../../utils/apiError';

// ── R&D Document Services ───────────────────────────────────────────
export const createDocument = async (data: CreateDocumentInput): Promise<IRndDocumentDocument> =>
    RndDocument.create(data);

export const getDocumentsByProject = async (projectId: string) => {
    return RndDocument.find({ projectId })
        .populate('uploadedBy', 'firstName lastName email avatarUrl')
        .sort({ createdAt: -1 });
};

export const getDocumentById = async (id: string): Promise<IRndDocumentDocument> => {
    const doc = await RndDocument.findById(id)
        .populate('uploadedBy', 'firstName lastName email avatarUrl')
        .populate('projectId', 'title');
    if (!doc) throw new AppError('Document not found', 404);
    return doc;
};

export const updateDocument = async (id: string, data: UpdateDocumentInput): Promise<IRndDocumentDocument> => {
    const doc = await RndDocument.findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .populate('uploadedBy', 'firstName lastName email avatarUrl');
    if (!doc) throw new AppError('Document not found', 404);
    return doc;
};

export const deleteDocument = async (id: string, userId: string): Promise<void> => {
    const doc = await RndDocument.findById(id);
    if (!doc) throw new AppError('Document not found', 404);
    
    // Only the uploader can delete their own document
    if (doc.uploadedBy.toString() !== userId) {
        throw new AppError('You can only delete documents you uploaded', 403);
    }
    
    await RndDocument.findByIdAndDelete(id);
};
