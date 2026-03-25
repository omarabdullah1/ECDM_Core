import jwt from 'jsonwebtoken';

async function testAll() {
    try {
        const token = jwt.sign({ id: '650000000000000000000000' }, 'ecdm_core_super_secret_key_2026_production', { expiresIn: '1h' });
        const headers = { 'Authorization': `Bearer ${token}` };

        console.log('Fetching all users...');
        const res = await fetch('http://localhost:5001/api/hr/users?limit=1000', { headers });
        const data = await res.json();
        
        const users = data.data?.data || data.data || [];
        console.log(`Found ${users.length} users. Testing profiles...`);

        let errors = 0;
        for (const emp of users) {
             const p1 = await fetch(`http://localhost:5001/api/hr/users/${emp._id}/profile`, { headers });
             if (!p1.ok) {
                 const text = await p1.text();
                 console.error(`❌ 500 on _id ${emp._id}: ${text}`);
                 errors++;
             }

             if (emp.employeeId) {
                 const p2 = await fetch(`http://localhost:5001/api/hr/users/${emp.employeeId}/profile`, { headers });
                 if (!p2.ok) {
                     const text = await p2.text();
                     console.error(`❌ 500 on employeeId ${emp.employeeId}: ${text}`);
                     errors++;
                 }
             }
        }
        
        console.log(`Done testing ${users.length} users. Total errors: ${errors}`);
    } catch(e) { 
        console.error('Script Error:', e) 
    }
}
testAll();
