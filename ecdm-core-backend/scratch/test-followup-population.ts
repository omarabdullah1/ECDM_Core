import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Customer from '../src/features/shared/models/contact.model';
import SalesData from '../src/features/sales/models/sales-data.model';
import FollowUp from '../src/features/customer/models/follow-up.model';
import { FollowUpStatus } from '../src/features/customer/types/follow-up.types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
}

const testPopulation = async () => {
    try {
        console.log('🔌 Connecting to DB...');
        await mongoose.connect(MONGODB_URI);
        
        // 1. Get a test customer
        let customer = await Customer.findOne();
        if (!customer) {
            console.log('✨ Creating test customer...');
            customer = await Customer.create({
                customerId: 'TEST-001',
                name: 'Test Customer',
                phone: '1234567890',
            });
        }
        console.log('👤 Customer:', customer.name, customer._id);

        // 2. Create SalesData record
        console.log('📈 Creating SalesData...');
        const salesData = await SalesData.create({
            customer: customer._id,
            issue: 'Test Issue from SalesData',
            callDate: new Date(),
        });
        console.log('✅ SalesData created:', salesData._id);

        // 3. Create FollowUp (Bypassing Service, calling Model directly to test hook)
        console.log('📞 Creating FollowUp (linked to SalesData)...');
        const followUp = await FollowUp.create({
            customer: customer._id,
            salesDataId: salesData._id,
            followUpDate: new Date(),
            status: FollowUpStatus.Pending,
        });
        
        console.log('🔍 Verifying orderContext...');
        console.log('FollowUp ID:', followUp._id);
        console.log('orderContext:', JSON.stringify(followUp.orderContext, null, 2));

        if (followUp.orderContext?.customerName === customer.name && 
            followUp.orderContext?.customerId === customer.customerId) {
            console.log('✅ SUCCESS: orderContext populated correctly!');
        } else {
            console.error('❌ FAILURE: orderContext is missing or incorrect.');
        }

        // Cleanup
        await FollowUp.findByIdAndDelete(followUp._id);
        await SalesData.findByIdAndDelete(salesData._id);
        // Note: keeping the customer for other tests

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error during test:', error);
        await mongoose.disconnect();
    }
};

testPopulation();
