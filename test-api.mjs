async function test() {
    try {
        const profRes = await fetch("http://localhost:5001/api/hr/users/650000000000000000000000/profile", {
            headers: {
                // we might get 401 Unauthorized but let's see. If we do, we need a token.
            }
        });
        const errBody = await profRes.text();
        console.error('ERROR RESPONSE:', profRes.status, errBody);
    } catch (e) {
        console.error(e);
    }
}
test();
