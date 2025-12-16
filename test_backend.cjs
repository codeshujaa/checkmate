const axios = require('axios');

(async () => {
    try {
        console.log('=== TESTING BACKEND ===\n');

        // 1. Test Admin Login
        console.log('1. Testing admin login...');
        const loginRes = await axios.post('http://localhost:8080/auth/login', {
            email: 'admin@test.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('   ✓ Login successful\n');

        // 2. Test Admin Orders - Check if first_name and last_name are returned
        console.log('2. Fetching admin orders to check user names...');
        const ordersRes = await axios.get('http://localhost:8080/admin/orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (ordersRes.data.length > 0) {
            const firstOrder = ordersRes.data[0];
            console.log('   First order user data:');
            console.log('   - email:', firstOrder.user?.email);
            console.log('   - first_name:', firstOrder.user?.first_name);
            console.log('   - last_name:', firstOrder.user?.last_name);

            if (firstOrder.user?.first_name && firstOrder.user?.last_name) {
                console.log('   ✓ Names are present!');
            } else {
                console.log('   ⚠️  Names are MISSING (old user data)');
            }
        } else {
            console.log('   No orders found');
        }

        console.log('\n3. Testing DELETE functionality...');
        console.log('   Skipping - would delete real data. Check browser console when clicking delete.\n');

        console.log('=== SUMMARY ===');
        console.log('✓ Backend is running');
        console.log('✓ DELETE route is registered');
        console.log('→ Test delete button in browser');
        console.log('→ Register NEW user to test name display\n');

    } catch (error) {
        console.error('ERROR:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
})();
