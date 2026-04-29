import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import User from '../features/auth/auth.model';
import { UserRole } from '../features/auth/auth.types';
import Customer from '../features/shared/models/contact.model';
import { CustomerSector, CustomerType } from '../features/shared/types/contact.types';
import Campaign from '../features/marketing/models/campaign.model';
import MarketingLead from '../features/marketing/models/marketing-lead.model';
import { MarketingLeadSource, MarketingLeadStatus } from '../features/marketing/types/marketing-leads.types';
import SalesLead from '../features/sales/models/sales-lead.model';
import { SalesLeadStatus } from '../features/sales/types/sales-leads.types';

type SeedUser = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
    phone: string;
};

type SeedCustomer = {
    name: string;
    phone: string;
    email: string;
    company: string;
    region: string;
    type: CustomerType;
    sector: CustomerSector;
};

const seedUsers: SeedUser[] = [
    {
        firstName: 'Omar',
        lastName: 'Admin',
        email: 'omar.admin@dummy.local',
        password: 'DummyPass123!',
        role: UserRole.SuperAdmin,
        phone: '+201000000001',
    },
    {
        firstName: 'Sara',
        lastName: 'Sales',
        email: 'sara.sales@dummy.local',
        password: 'DummyPass123!',
        role: UserRole.Sales,
        phone: '+201000000002',
    },
    {
        firstName: 'Mona',
        lastName: 'Marketing',
        email: 'mona.marketing@dummy.local',
        password: 'DummyPass123!',
        role: UserRole.Marketing,
        phone: '+201000000003',
    },
];

const seedCustomers: SeedCustomer[] = [
    {
        name: 'Nile Foods',
        phone: '+201100000001',
        email: 'ops@nilefoods.example',
        company: 'Nile Foods LLC',
        region: 'Cairo',
        type: CustomerType.Website,
        sector: CustomerSector.B2B,
    },
    {
        name: 'Lotus Clinics',
        phone: '+201100000002',
        email: 'contact@lotusclinics.example',
        company: 'Lotus Clinics',
        region: 'Giza',
        type: CustomerType.Referral,
        sector: CustomerSector.B2C,
    },
    {
        name: 'Orion Logistics',
        phone: '+201100000003',
        email: 'support@orionlogistics.example',
        company: 'Orion Logistics',
        region: 'Alexandria',
        type: CustomerType.Google,
        sector: CustomerSector.B2B,
    },
];

const upsertUsers = async () => {
    const ids: mongoose.Types.ObjectId[] = [];

    for (const user of seedUsers) {
        const existing = await User.findOne({ email: user.email });

        if (existing) {
            ids.push(existing._id);
            continue;
        }

        const created = await User.create(user);
        ids.push(created._id);
    }

    return ids;
};

const upsertCustomers = async () => {
    const ids: mongoose.Types.ObjectId[] = [];

    for (const customer of seedCustomers) {
        const existing = await Customer.findOne({ phone: customer.phone });

        if (existing) {
            ids.push(existing._id);
            continue;
        }

        const created = await Customer.create(customer);
        ids.push(created._id);
    }

    return ids;
};

const upsertCampaigns = async (createdBy?: mongoose.Types.ObjectId) => {
    const campaignDefinitions = [
        {
            campaignName: 'Spring Facility Upgrade',
            status: 'Running',
            impressions: 42000,
            conversions: 620,
            salesRevenue: 185000,
            adSpend: 28000,
            createdBy,
        },
        {
            campaignName: 'Industrial Service Retargeting',
            status: 'Planned',
            impressions: 18000,
            conversions: 210,
            salesRevenue: 64000,
            adSpend: 12500,
            createdBy,
        },
    ];

    const ids: mongoose.Types.ObjectId[] = [];

    for (const campaign of campaignDefinitions) {
        const existing = await Campaign.findOne({ campaignName: campaign.campaignName });

        if (existing) {
            ids.push(existing._id);
            continue;
        }

        const created = await Campaign.create(campaign);
        ids.push(created._id);
    }

    return ids;
};

const upsertMarketingLeads = async (
    customerIds: mongoose.Types.ObjectId[],
    campaignIds: mongoose.Types.ObjectId[],
    assignedTo?: mongoose.Types.ObjectId,
) => {
    const leadDefinitions = [
        {
            customerId: customerIds[0],
            source: MarketingLeadSource.Web,
            status: MarketingLeadStatus.New,
            value: 35000,
            notes: 'Interested in annual maintenance package.',
            campaign: campaignIds[0],
            assignedTo,
        },
        {
            customerId: customerIds[1],
            source: MarketingLeadSource.Referral,
            status: MarketingLeadStatus.Contacted,
            value: 22000,
            notes: 'Requested on-site demo in April.',
            campaign: campaignIds[0],
            assignedTo,
        },
        {
            customerId: customerIds[2],
            source: MarketingLeadSource.GoogleAds,
            status: MarketingLeadStatus.Qualified,
            value: 46000,
            notes: 'Needs bundled supply and installation offer.',
            campaign: campaignIds[1],
            assignedTo,
        },
    ];

    for (const lead of leadDefinitions) {
        const existing = await MarketingLead.findOne({
            customerId: lead.customerId,
            notes: lead.notes,
        });

        if (!existing) {
            await MarketingLead.create(lead);
        }
    }
};

const upsertSalesLeads = async (customerIds: mongoose.Types.ObjectId[]) => {
    const leadDefinitions = [
        {
            customerId: customerIds[0],
            issue: 'Cold room temperature fluctuations',
            order: 'Maintenance contract proposal',
            reason: 'Recurring refrigeration alarms',
            salesPerson: 'sara.sales@dummy.local',
            status: SalesLeadStatus.Contacted,
            typeOfOrder: 'Maintenance' as const,
            salesPlatform: 'Phone' as const,
            notes: 'Follow-up call scheduled for next Monday.',
        },
        {
            customerId: customerIds[1],
            issue: 'Sterilization unit replacement',
            order: 'Supply and installation package',
            reason: 'Existing unit reached end-of-life',
            salesPerson: 'sara.sales@dummy.local',
            status: SalesLeadStatus.Negotiation,
            typeOfOrder: 'Supply and installation' as const,
            salesPlatform: 'In Side' as const,
            notes: 'Pricing shared, waiting for procurement approval.',
        },
        {
            customerId: customerIds[2],
            issue: 'Warehouse spare parts stockout',
            order: 'General supplies quote',
            reason: 'Fast growth in weekly dispatch volume',
            salesPerson: 'sara.sales@dummy.local',
            status: SalesLeadStatus.New,
            typeOfOrder: 'General supplies' as const,
            salesPlatform: 'Online' as const,
            notes: 'Requested comparison between two product lines.',
        },
    ];

    for (const lead of leadDefinitions) {
        const existing = await SalesLead.findOne({
            customerId: lead.customerId,
            issue: lead.issue,
        });

        if (!existing) {
            await SalesLead.create(lead);
        }
    }
};

const seed = async () => {
    await connectDB();

    const userIds = await upsertUsers();
    const customerIds = await upsertCustomers();
    const campaignIds = await upsertCampaigns(userIds[2]);

    await upsertMarketingLeads(customerIds, campaignIds, userIds[2]);
    await upsertSalesLeads(customerIds);

    const [usersCount, customersCount, campaignsCount, marketingLeadsCount, salesLeadsCount] = await Promise.all([
        User.countDocuments(),
        Customer.countDocuments(),
        Campaign.countDocuments(),
        MarketingLead.countDocuments(),
        SalesLead.countDocuments(),
    ]);

    console.log('Dummy data seeding complete.');
    console.log(`Users: ${usersCount}`);
    console.log(`Customers: ${customersCount}`);
    console.log(`Campaigns: ${campaignsCount}`);
    console.log(`MarketingLeads: ${marketingLeadsCount}`);
    console.log(`SalesLeads: ${salesLeadsCount}`);
};

seed()
    .catch((error) => {
        console.error('Failed to seed dummy data:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });

