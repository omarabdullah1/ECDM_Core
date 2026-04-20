const mongoose = require('mongoose');
const Attendance = require('./src/features/hr/models/attendance.model').default;
const User = require('./src/features/auth/auth.model').default;
const { bulkCreate } = require('./src/features/hr/services/attendance.service');

async function testFilter() {
    await mongoose.connect('mongodb://localhost:27017/ecdm-core');
    
    try {
        // Create a test user
        const testEmpId = 'EMP-TEST-' + Date.now();
        await User.create({
            firstName: 'Test',
            lastName: 'User',
            email: 'test' + Date.now() + '@example.com',
            password: 'password123',
            employeeId: testEmpId,
            role: 'Sales'
        });
        console.log('Created test user with ID:', testEmpId);

        const records = [
            { employeeId: testEmpId, name: 'Test User', date: new Date(), status: 'Present' },
            { employeeId: 'EMP-FAKE-999', name: 'Fake Guy', date: new Date(), status: 'Absent' }
        ];

        console.log('Calling bulkCreate with one real and one fake ID...');
        const result = await bulkCreate(records);
        console.log('Result:', result);

        // Verify only 1 was inserted
        const count = await Attendance.countDocuments({ employeeId: { $in: [testEmpId, 'EMP-FAKE-999'] } });
        console.log('Attendance records found for these IDs:', count);

        if (count === 1) {
            console.log('✅ Success: Only the existing ID was processed.');
        } else {
            console.log('❌ Failure: Expected 1 record, found', count);
        }

    } finally {
        await mongoose.disconnect();
    }
}

testFilter().catch(console.error);
