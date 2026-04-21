import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import FollowUp from '../src/features/customer/models/follow-up.model';
import Feedback from '../src/features/customer/models/feedback.model';
import { populateOrderContext } from '../src/features/customer/utils/follow-up-context';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
}

const migrate = async () => {
    try {
        console.log('🔌 Connecting to DB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to:', mongoose.connection.name);

        // 1. Migrate FollowUp
        console.log('\n🔄 Migrating FollowUp records...');
        const followups = await FollowUp.find({
            $or: [
                { 'orderContext.customerName': '' },
                { 'orderContext.customerName': { $exists: false } },
                { orderContext: { $exists: false } }
            ]
        });
        
        console.log(`Found ${followups.length} FollowUp records to update.`);
        
        let fuCount = 0;
        for (const doc of followups) {
            const context = await populateOrderContext(
                doc.customerOrderId,
                doc.customer,
                doc.salesDataId,
                doc.leadId
            );
            if (context && context.customerName) {
                doc.orderContext = context as any;
                await doc.save();
                fuCount++;
            }
        }
        console.log(`✅ Updated ${fuCount} FollowUp records.`);

        // 2. Migrate Feedback
        console.log('\n🔄 Migrating Feedback records...');
        const feedbacks = await Feedback.find({
            $or: [
                { 'orderContext.customerName': '' },
                { 'orderContext.customerName': { $exists: false } },
                { orderContext: { $exists: false } }
            ]
        });
        
        console.log(`Found ${feedbacks.length} Feedback records to update.`);
        
        let fbCount = 0;
        for (const doc of feedbacks) {
            const context = await populateOrderContext(
                doc.customerOrderId,
                doc.customerId
            );
            if (context && context.customerName) {
                doc.orderContext = context as any;
                await doc.save();
                fbCount++;
            }
        }
        console.log(`✅ Updated ${fbCount} Feedback records.`);

        console.log('\n🎉 Migration completed successfully!');
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

migrate();
