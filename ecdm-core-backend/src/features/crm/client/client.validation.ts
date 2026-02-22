import { z } from 'zod';
import { ClientStatus } from './client.types';

const contactPersonSchema = z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    position: z.string().optional(),
    isPrimary: z.boolean().default(false),
});

export const createClientSchema = z.object({
    companyName: z.string().min(1, 'Company name is required').max(150),
    industry: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        zipCode: z.string().optional(),
    }).optional(),
    contactPersons: z.array(contactPersonSchema).optional(),
    status: z.nativeEnum(ClientStatus).optional(),
    assignedTo: z.string().optional(),
    notes: z.string().max(2000).optional(),
    tags: z.array(z.string()).optional(),
    annualRevenue: z.number().min(0).optional(),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
