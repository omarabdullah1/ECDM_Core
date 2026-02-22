import { AppError } from '../../../utils/apiError';
import Client from './client.model';
import { IClientDocument } from './client.types';
import { CreateClientInput, UpdateClientInput } from './client.validation';

// ── Create ──────────────────────────────────────────────────────────
export const createClient = async (data: CreateClientInput): Promise<IClientDocument> => {
    const client = await Client.create(data);
    return client;
};

// ── Get all (paginated + search/filter) ─────────────────────────────
export const getAllClients = async (
    query: Record<string, unknown>,
    skip: number,
    limit: number,
): Promise<{ clients: IClientDocument[]; total: number }> => {
    const filter: Record<string, unknown> = {};

    if (query.status) filter.status = query.status;
    if (query.assignedTo) filter.assignedTo = query.assignedTo;
    if (query.industry) filter.industry = { $regex: query.industry, $options: 'i' };
    if (query.search) {
        filter.$or = [
            { companyName: { $regex: query.search, $options: 'i' } },
            { email: { $regex: query.search, $options: 'i' } },
            { notes: { $regex: query.search, $options: 'i' } },
        ];
    }

    const [clients, total] = await Promise.all([
        Client.find(filter)
            .populate('assignedTo', 'firstName lastName email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }),
        Client.countDocuments(filter),
    ]);

    return { clients, total };
};

// ── Get by ID ───────────────────────────────────────────────────────
export const getClientById = async (id: string): Promise<IClientDocument> => {
    const client = await Client.findById(id).populate('assignedTo', 'firstName lastName email');
    if (!client) {
        throw new AppError('Client not found', 404);
    }
    return client;
};

// ── Update ──────────────────────────────────────────────────────────
export const updateClient = async (
    id: string,
    data: UpdateClientInput,
): Promise<IClientDocument> => {
    const client = await Client.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    }).populate('assignedTo', 'firstName lastName email');

    if (!client) {
        throw new AppError('Client not found', 404);
    }
    return client;
};

// ── Delete ──────────────────────────────────────────────────────────
export const deleteClient = async (id: string): Promise<void> => {
    const client = await Client.findByIdAndDelete(id);
    if (!client) {
        throw new AppError('Client not found', 404);
    }
};
