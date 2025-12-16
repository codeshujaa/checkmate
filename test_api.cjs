const axios = require('axios');

(async () => {
    try {
        const loginRes = await axios.post('http://localhost:8080/auth/login', {
            email: 'admin@test.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;

        const ordersRes = await axios.get('http://localhost:8080/admin/orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const order7 = ordersRes.data.find(o => o.id === 7);
        if (order7) {
            console.log('Order #7:');
            console.log('ID:', order7.id);
            console.log('Original filename:', order7.original_filename);
            console.log('Local file path:', order7.local_file_path);
            console.log('Status:', order7.status);
        } else {
            console.log('Order #7 not found');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
})();
