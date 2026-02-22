import Invoice from './invoice.model';
import { CreateInvoiceInput, UpdateInvoiceInput } from './invoice.validation';
import { IInvoiceDocument } from './invoice.types';
import { AppError } from '../../../utils/apiError';

const generateInvoiceNumber = async (): Promise<string> => {
    const count = await Invoice.countDocuments();
    return `INV-${String(count + 1).padStart(5, '0')}`;
};

export const createInvoice = async (data: CreateInvoiceInput): Promise<IInvoiceDocument> => {
    const invoiceNumber = await generateInvoiceNumber();
    const invoice = new Invoice({ ...data, invoiceNumber });
    await invoice.save(); // triggers pre-save for totals
    return invoice.populate({ path: 'client', select: 'companyName email' });
};

export const getInvoices = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, search, status } = query;
    const filter: Record<string, unknown> = {};
    if (search) filter.invoiceNumber = { $regex: search, $options: 'i' };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
        Invoice.find(filter).populate('client', 'companyName email').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Invoice.countDocuments(filter),
    ]);
    return { data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
};

export const getInvoiceById = async (id: string): Promise<IInvoiceDocument> => {
    const invoice = await Invoice.findById(id).populate('client', 'companyName email');
    if (!invoice) throw new AppError('Invoice not found', 404);
    return invoice;
};

export const updateInvoice = async (id: string, data: UpdateInvoiceInput): Promise<IInvoiceDocument> => {
    const invoice = await Invoice.findById(id);
    if (!invoice) throw new AppError('Invoice not found', 404);
    Object.assign(invoice, data);
    await invoice.save(); // triggers pre-save for totals re-calc
    return invoice.populate({ path: 'client', select: 'companyName email' });
};

export const deleteInvoice = async (id: string): Promise<void> => {
    const invoice = await Invoice.findByIdAndDelete(id);
    if (!invoice) throw new AppError('Invoice not found', 404);
};
