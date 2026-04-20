import mongoose from 'mongoose';
import Attendance from '../src/features/hr/models/attendance.model';
import User from '../src/features/auth/auth.model';
import { bulkCreate } from '../src/features/hr/services/attendance.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function testFilter() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecdm-core';
    await mongoose.connect(mongoUri);
    
    try {
        console.log('--- Attendance Filtering Test ---');
        
        // 1. Create a test user
        const testEmpId = 'EMP-FILTER-TEST-' + Date.now();
        const testUser = await User.create({
            firstName: 'Test',
            lastName: 'User',
            email: 'filter-test-' + Date.now() + '@example.com',
            password: 'password123',
            employeeId: testEmpId,
            role: 'Sales'
        });
        console.log(`✅ Created test user: ${testUser.fullName} (ID: ${testEmpId})`);

        // 2. Prepare records (one valid ID, one invalid)
        const records = [
            { 
                employeeId: testEmpId, 
                name: 'Test User', 
                date: new Date(), 
                status: 'Present' as any,
                department: 'Test Dept'
            },
            { 
                employeeId: 'EMP-FAKE-ID-99999', 
                name: 'Fake Person', 
                date: new Date(), 
                status: 'Absent' as any,
                department: 'None'
            }
        ];

        console.log('3. Calling attendanceService.bulkCreate()...');
        const result = await bulkCreate(records);
        console.log('Result from service:', result);

        // 4. Verify database state
        const validRecord = await Attendance.findOne({ employeeId: testEmpId });
        const invalidRecord = await Attendance.findOne({ employeeId: 'EMP-FAKE-ID-99999' });

        if (validRecord) {
            console.log('✅ Success: Valid ID record found in DB.');
            if (validRecord.userId && validRecord.userId.toString() === testUser._id.toString()) {
                console.log('✅ Success: Record is correctly linked to User ID.');
            } else {
                console.log('❌ Failure: Record is NOT linked to User ID.');
            }
        } else {
            console.log('❌ Failure: Valid ID record NOT found in DB.');
        }

        if (!invalidRecord) {
            console.log('✅ Success: Invalid ID record was correctly filtered out and not saved.');
        } else {
            console.log('❌ Failure: Invalid ID record was found in DB! Filtering failed.');
        }

        // Cleanup
        await Attendance.deleteOne({ _id: validRecord?._id });
        await User.deleteOne({ _id: testUser._id });
        console.log('--- Test Completed ---');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testFilter();
