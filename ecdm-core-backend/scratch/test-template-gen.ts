import mongoose from 'mongoose';
import * as xlsx from 'xlsx';
import User from '../src/features/auth/auth.model';
import * as dotenv from 'dotenv';

dotenv.config();

async function testTemplateGen() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecdm-core';
    await mongoose.connect(mongoUri);
    
    try {
        console.log('--- Attendance Template Generation Test ---');
        
        const employees = await User.find({ 
            employeeId: { $ne: null, $exists: true } 
        }).select('employeeId firstName lastName department').sort({ employeeId: 1 });

        console.log(`Found ${employees.length} employees with IDs.`);

        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const dayStr = today.toLocaleDateString('en-GB', { weekday: 'long' });

        const data = employees.map(emp => ({
            'EmployeeID': emp.employeeId,
            'Name': `${emp.firstName} ${emp.lastName}`.trim(),
            'Department': emp.department || '',
            'Date': dateStr,
            'Day': dayStr,
            'Check In': '',
            'Check Out': '',
            'Status': '',
            'Notes': ''
        }));

        console.log('Sample Data Row:', data[0]);

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(wb, ws, 'Attendance Template');

        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        console.log(`✅ Success: Generated Excel buffer of size ${buffer.length} bytes.`);
        
        if (buffer.length > 0) {
            console.log('✅ Success: Template buffer is valid.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testTemplateGen();
