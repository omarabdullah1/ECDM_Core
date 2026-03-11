/**
 * Test Script: Modification Request Review API
 * 
 * This script tests the fixed review endpoint to ensure it properly
 * handles approval/rejection of modification requests.
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

// You'll need to get a real token from your login
const ADMIN_TOKEN = 'YOUR_ADMIN_JWT_TOKEN_HERE';

async function testReviewEndpoint() {
    console.log('🧪 Testing Modification Request Review API\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        // Step 1: Get pending modification requests
        console.log('📋 Step 1: Fetching pending modification requests...');
        const listResponse = await axios.get(
            `${API_BASE_URL}/admin/modification-requests`,
            {
                headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
                params: { status: 'Pending', limit: 5 }
            }
        );

        const pendingRequests = listResponse.data.data.data;
        console.log(`✅ Found ${pendingRequests.length} pending requests\n`);

        if (pendingRequests.length === 0) {
            console.log('ℹ️  No pending requests to test with.');
            console.log('   Create a modification request first by editing a sales order as a non-admin user.\n');
            return;
        }

        // Step 2: Test approval with the first pending request
        const testRequest = pendingRequests[0];
        console.log('📝 Step 2: Testing APPROVAL...');
        console.log(`   Request ID: ${testRequest._id}`);
        console.log(`   Module: ${testRequest.moduleName}`);
        console.log(`   Requested by: ${testRequest.requestedBy.firstName} ${testRequest.requestedBy.lastName}`);
        console.log(`   Proposed changes: ${Object.keys(testRequest.proposedData).join(', ')}\n`);

        const approvalPayload = {
            status: 'Approved',
            reviewNotes: 'Test approval - changes look good!'
        };

        console.log('   Sending payload:', JSON.stringify(approvalPayload, null, 2));

        const approvalResponse = await axios.post(
            `${API_BASE_URL}/admin/modification-requests/${testRequest._id}/review`,
            approvalPayload,
            {
                headers: {
                    Authorization: `Bearer ${ADMIN_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`✅ Status: ${approvalResponse.status}`);
        console.log(`✅ Response:`, JSON.stringify(approvalResponse.data, null, 2));
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('🎉 SUCCESS! The review endpoint is working correctly.\n');

    } catch (error) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ ERROR OCCURRED:\n');

        if (error.response) {
            console.error(`Status: ${error.response.status} ${error.response.statusText}`);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
            
            if (error.response.status === 422) {
                console.error('\n🔍 422 Error Details:');
                console.error('This indicates a validation error.');
                console.error('The payload structure might not match the schema.\n');
            }
        } else {
            console.error('Error:', error.message);
        }
        
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
}

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Modification Request Review API Test                         ║
║  Testing the fix for 422 Unprocessable Entity error          ║
╚═══════════════════════════════════════════════════════════════╝

⚠️  IMPORTANT: 
   1. Make sure the backend server is running (npm run dev)
   2. Update ADMIN_TOKEN with a valid JWT token from login
   3. Ensure there's at least one pending modification request

To get a token:
   1. Login via Postman/frontend as an Admin user
   2. Copy the JWT token from the response
   3. Update ADMIN_TOKEN variable above

`);

// Uncomment to run the test:
// testReviewEndpoint();

console.log('👉 Uncomment the last line in this file to run the test.\n');
