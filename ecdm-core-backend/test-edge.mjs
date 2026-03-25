import jwt from 'jsonwebtoken';

async function testEdgeCases() {
    try {
        const token = jwt.sign({ id: '650000000000000000000000' }, 'ecdm_core_super_secret_key_2026_production', { expiresIn: '1h' });
        const headers = { 'Authorization': `Bearer ${token}` };

        for (const testId of ['undefined', 'null', 'EMP-999999', 'some_random_string']) {
            console.log(`\nTesting edge case ID: ${testId}`);
            const res = await fetch(`http://localhost:5001/api/hr/users/${testId}/profile`, { headers });
            const text = await res.text();
            console.log(`Status: ${res.status}`);
            console.log(`Body: ${text.substring(0, 100)}...`);
        }
    } catch(e) { console.error(e) }
}
testEdgeCases();
