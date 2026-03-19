import Campaign from '../models/campaign.model';
import SalesOrder from '../../sales/models/sales-order.model';
import SalesLead from '../../sales/models/sales-lead.model';
import MarketingLead from '../models/marketing-lead.model';
import { AppError } from '../../../utils/apiError';
import { Types } from 'mongoose';

export interface CampaignRevenueUpdate {
    campaignId: Types.ObjectId;
    addedRevenue: number;
    campaignName: string;
}

/**
 * Update Campaign's actual sales revenue when a SalesOrder is marked as Won.
 * Traces the relationship: SalesOrder -> SalesLead -> MarketingLead -> Campaign
 * 
 * @param salesOrderId - The ID of the completed SalesOrder
 * @returns The campaign that was updated, or null if no campaign found
 */
export const updateCampaignRevenueFromSalesOrder = async (
    salesOrderId: string
): Promise<CampaignRevenueUpdate | null> => {
    // Step 1: Find SalesOrder and get grandTotal from quotation
    const salesOrder = await SalesOrder.findById(salesOrderId)
        .populate('salesLead')
        .populate('customer');

    if (!salesOrder) {
        console.warn(`⚠️ SalesOrder not found: ${salesOrderId}`);
        return null;
    }

    const grandTotal = salesOrder.quotation?.grandTotal;
    if (!grandTotal || grandTotal <= 0) {
        console.log(`ℹ️ No quotation grandTotal for SalesOrder ${salesOrderId}, skipping Campaign ROI update`);
        return null;
    }

    // Step 2: Try to find Campaign via SalesLead -> MarketingLead chain
    let campaignId: Types.ObjectId | null = null;

    // Path A: Via SalesLead
    if ((salesOrder.salesLead as any)?._id) {
        const salesLeadId = (salesOrder.salesLead as any)._id;
        const salesLead = await SalesLead.findById(salesLeadId);

        if (salesLead?.marketingLeadId) {
            const marketingLead = await MarketingLead.findById(salesLead.marketingLeadId);
            if (marketingLead?.campaign) {
                campaignId = marketingLead.campaign as Types.ObjectId;
                console.log(`🔗 Campaign found via SalesLead path: ${campaignId}`);
            }
        }
    }

    // Path B: Via Customer (most recent MarketingLead for this customer)
    if (!campaignId && salesOrder.customer) {
        const marketingLead = await MarketingLead.findOne({
            customerId: salesOrder.customer
        }).sort({ createdAt: -1 }); // Get most recent lead

        if (marketingLead?.campaign) {
            campaignId = marketingLead.campaign as Types.ObjectId;
            console.log(`🔗 Campaign found via Customer path: ${campaignId}`);
        }
    }

    if (!campaignId) {
        console.log(`⚠️ No Campaign found for SalesOrder ${salesOrderId}`);
        console.log(`   Customer: ${salesOrder.customer}`);
        console.log(`   SalesLead: ${(salesOrder.salesLead as any)?._id || 'none'}`);
        return null;
    }

    // Step 3: Update Campaign's salesRevenue using $inc for atomic update
    const campaign = await Campaign.findByIdAndUpdate(
        campaignId,
        { $inc: { salesRevenue: grandTotal } },
        { new: true }
    );

    if (!campaign) {
        throw new AppError(`Campaign not found: ${campaignId}`, 404);
    }

    console.log(`✅ Campaign ROI Updated:`);
    console.log(`   Campaign: ${campaign.campaignName || campaign.campaignId}`);
    console.log(`   Added Revenue: +${grandTotal}`);
    console.log(`   New Total: ${campaign.salesRevenue}`);

    return {
        campaignId,
        addedRevenue: grandTotal,
        campaignName: campaign.campaignName || campaign.campaignId || campaignId.toString(),
    };
};

/**
 * Get Campaign ROI summary with conversion metrics
 * Calculates ROAS (Return on Ad Spend) if adSpend is available
 */
export const getCampaignROI = async (campaignId: string) => {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        throw new AppError('Campaign not found', 404);
    }

    const roas = campaign.adSpend > 0
        ? Number((campaign.salesRevenue / campaign.adSpend).toFixed(2))
        : null;

    return {
        campaignId: campaign._id,
        campaignName: campaign.campaignName,
        salesRevenue: campaign.salesRevenue,
        adSpend: campaign.adSpend,
        roas,
        conversions: campaign.conversions,
        cpa: campaign.cpa,
    };
};
