import CustomerOrder from '../models/customer-order.model';
import SalesData from '../../sales/models/sales-data.model';
import Customer from '../../shared/models/contact.model';
import SalesLead from '../../sales/models/sales-lead.model';
import { IOrderContext } from '../types/follow-up.types';

/**
 * SSOT: Populate the orderContext field based on available source references.
 * Priority: CustomerOrder > SalesData > SalesLead > Direct Customer
 */
export const populateOrderContext = async (
    customerOrderId?: any, 
    customerId?: any, 
    salesDataId?: any, 
    leadId?: any
): Promise<IOrderContext | undefined> => {
    const context: IOrderContext = {
        customerName: '',
        customerPhone: '',
        customerId: '',
        engineerName: '',
        dealStatus: '',
        orderId: '',
    };

    let customerDoc: any = null;

    // 1. Try CustomerOrder (High Priority - Ops)
    if (customerOrderId) {
        const order = await CustomerOrder.findById(customerOrderId).populate('customerId', 'name phone customerId');
        if (order) {
            customerDoc = order.customerId;
            context.customerName = customerDoc?.name || '';
            context.customerPhone = customerDoc?.phone || '';
            context.customerId = customerDoc?.customerId || String(customerId) || '';
            context.engineerName = order.engineerName || '';
            context.visitDate = order.actualVisitDate || order.scheduledVisitDate;
            context.scheduledVisitDate = order.scheduledVisitDate;
            context.actualVisitDate = order.actualVisitDate;
            context.startDate = order.startDate;
            context.endDate = order.endDate;
            context.dealStatus = order.deal || '';
            context.orderId = String(customerOrderId);
            return context;
        }
    }

    // 2. Try SalesData (Medium Priority - Marketing/Sales)
    if (salesDataId) {
        const salesData = await SalesData.findById(salesDataId).populate('customer', 'name phone customerId');
        if (salesData) {
            customerDoc = salesData.customer;
            context.customerName = customerDoc?.name || '';
            context.customerPhone = customerDoc?.phone || '';
            context.customerId = customerDoc?.customerId || String(customerId) || '';
            context.orderId = String(salesDataId);
            context.visitDate = salesData.callDate;
            return context;
        }
    }

    // 3. Try SalesLead
    if (leadId) {
        const lead = await SalesLead.findById(leadId).populate('customerId', 'name phone customerId');
        if (lead) {
            customerDoc = lead.customerId;
            context.customerName = customerDoc?.name || '';
            context.customerPhone = customerDoc?.phone || '';
            context.customerId = customerDoc?.customerId || String(customerId) || '';
            return context;
        }
    }

    // 4. Fallback to direct Customer reference
    if (customerId) {
        const customer = await Customer.findById(customerId);
        if (customer) {
            context.customerName = customer.name || '';
            context.customerPhone = customer.phone || '';
            context.customerId = customer.customerId || String(customerId) || '';
        }
    }

    return context;
};
