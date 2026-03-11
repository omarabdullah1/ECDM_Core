/**
 * Quick script to view and clear pending modification requests
 * Run with: node clear-pending-request.js
 */

const mongoose = require('mongoose');

// MongoDB connection string (update if different)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecdm_core';

async function viewAndClearPendingRequests() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const ModificationRequest = mongoose.model('ModificationRequest', new mongoose.Schema({
            moduleName: String,
            recordId: mongoose.Schema.Types.ObjectId,
            requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            status: String,
            originalData: mongoose.Schema.Types.Mixed,
            proposedData: mongoose.Schema.Types.Mixed,
            createdAt: Date,
        }, { collection: 'modificationrequests' }));

        // Find all pending requests
        const pendingRequests = await ModificationRequest.find({ status: 'Pending' })
            .sort({ createdAt: -1 });

        console.log(`\n📋 Found ${pendingRequests.length} pending modification requests:\n`);

        pendingRequests.forEach((req, index) => {
            console.log(`${index + 1}. Module: ${req.moduleName}`);
            console.log(`   Record ID: ${req.recordId}`);
            console.log(`   Requested by User ID: ${req.requestedBy}`);
            console.log(`   Created: ${req.createdAt}`);
            console.log(`   Proposed changes:`, Object.keys(req.proposedData || {}).join(', ') || 'None');
            console.log('   ---');
        });

        // Option to clear all pending requests
        console.log('\n⚠️  Clearing all pending modification requests...\n');

        // DELETE ALL PENDING REQUESTS:
        const result = await ModificationRequest.deleteMany({ status: 'Pending' });
        console.log(`✅ Deleted ${result.deletedCount} pending modification requests\n`);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

viewAndClearPendingRequests();
