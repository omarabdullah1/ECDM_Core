import mongoose from 'mongoose';
import ModificationRequest from '../models/modification-request.model';
import { 
    IModificationRequestDocument, 
    ModificationRequestStatus,
    ModuleName 
} from '../types/modification-request.types';
import { 
    CreateModificationRequestInput, 
    ReviewRequestInput,
    QueryModificationRequestsInput 
} from '../validation/modification-request.validation';
import { AppError } from '../../../utils/apiError';

/**
 * Create a new modification request (used by interceptor logic)
 */
export const create = async (
    data: CreateModificationRequestInput & { requestedBy: string }
): Promise<IModificationRequestDocument> => {
    // Check if there's already a pending request for this record
    const existing = await ModificationRequest.findOne({
        moduleName: data.moduleName,
        recordId: data.recordId,
        status: ModificationRequestStatus.Pending,
    });

    if (existing) {
        throw new AppError(
            'A pending modification request already exists for this record. Please wait for it to be reviewed.',
            409
        );
    }

    return ModificationRequest.create({
        moduleName: data.moduleName,
        recordId: data.recordId,
        requestedBy: data.requestedBy,
        originalData: data.originalData,
        proposedData: data.proposedData,
        status: ModificationRequestStatus.Pending,
    });
};

/**
 * Get all modification requests with pagination and filtering
 */
export const getAll = async (query: QueryModificationRequestsInput) => {
    const { page = 1, limit = 10, status, moduleName } = query;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (moduleName) filter.moduleName = moduleName;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        ModificationRequest.find(filter)
            .populate('requestedBy', 'firstName lastName email')
            .populate('reviewedBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        ModificationRequest.countDocuments(filter),
    ]);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get a single modification request by ID
 */
export const getById = async (id: string): Promise<IModificationRequestDocument> => {
    const doc = await ModificationRequest.findById(id)
        .populate('requestedBy', 'firstName lastName email role')
        .populate('reviewedBy', 'firstName lastName email');
    
    if (!doc) throw new AppError('Modification request not found', 404);
    return doc;
};

/**
 * Review (approve/reject) a modification request
 * If approved, applies the changes to the target record
 */
export const review = async (
    id: string,
    reviewData: ReviewRequestInput,
    reviewerId: string
): Promise<IModificationRequestDocument> => {
    const request = await ModificationRequest.findById(id);
    
    if (!request) {
        throw new AppError('Modification request not found', 404);
    }

    if (request.status !== ModificationRequestStatus.Pending) {
        throw new AppError(
            `This request has already been ${request.status.toLowerCase()}`,
            400
        );
    }

    // If approved, apply changes to the target record
    if (reviewData.status === 'Approved') {
        try {
            // Get the model dynamically based on moduleName
            const Model = mongoose.model(request.moduleName);
            
            await Model.findByIdAndUpdate(
                request.recordId,
                request.proposedData,
                { new: true, runValidators: true }
            );
        } catch (error) {
            // If model doesn't exist or update fails
            if (error instanceof Error && error.name === 'MissingSchemaError') {
                throw new AppError(`Model ${request.moduleName} not found`, 500);
            }
            throw error;
        }
    }

    // Update the request status
    request.status = reviewData.status as ModificationRequestStatus;
    request.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
    request.reviewNotes = reviewData.reviewNotes || '';
    
    await request.save();

    return request;
};

/**
 * Get pending request count (for dashboard/notifications)
 */
export const getPendingCount = async (): Promise<number> => {
    return ModificationRequest.countDocuments({ 
        status: ModificationRequestStatus.Pending 
    });
};

/**
 * Get pending requests for a specific module
 */
export const getPendingByModule = async (
    moduleName: ModuleName
): Promise<IModificationRequestDocument[]> => {
    return ModificationRequest.find({
        moduleName,
        status: ModificationRequestStatus.Pending,
    })
        .populate('requestedBy', 'firstName lastName email')
        .sort({ createdAt: -1 });
};

/**
 * Check if a record has a pending modification request
 */
export const hasPendingRequest = async (
    moduleName: ModuleName,
    recordId: string
): Promise<boolean> => {
    const count = await ModificationRequest.countDocuments({
        moduleName,
        recordId,
        status: ModificationRequestStatus.Pending,
    });
    return count > 0;
};

/**
 * Cancel a pending request (by the requester or admin)
 */
export const cancel = async (
    id: string,
    userId: string,
    isAdmin: boolean
): Promise<void> => {
    const request = await ModificationRequest.findById(id);
    
    if (!request) {
        throw new AppError('Modification request not found', 404);
    }

    if (request.status !== ModificationRequestStatus.Pending) {
        throw new AppError('Only pending requests can be cancelled', 400);
    }

    // Only the requester or an admin can cancel
    if (!isAdmin && request.requestedBy.toString() !== userId) {
        throw new AppError('You can only cancel your own requests', 403);
    }

    await ModificationRequest.findByIdAndDelete(id);
};

