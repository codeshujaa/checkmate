const axios = require('axios');

(async () => {
    try {
        const loginRes = await axios.post('http://localhost:8080/auth/login', {
            email: 'admin@test.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;

        // Test download using the actual stored filename
        console.log('Testing download with actual filename from Order #7...');

        const downloadRes = await axios.get(
            'http://localhost:8080/download/1_1765899518_Decision_Tree_Classification_Analysis-1758865421.6606038.docx',
            {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'arraybuffer'
            }
        );

        console.log('Download SUCCESS!');
        console.log('Status:', downloadRes.status);
        console.log('File size:', downloadRes.data.length, 'bytes');
    } catch (error) {
        console.error('Download FAILED');
        console.error('Status:', error.response?.status);
        console.error('Message:', error.message);
    }
})();
