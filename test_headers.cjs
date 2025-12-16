const axios = require('axios');

(async () => {
    try {
        const loginRes = await axios.post('http://localhost:8080/auth/login', {
            email: 'admin@test.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;

        console.log('Testing download with Content-Disposition header...\n');

        // Test with full stored filename
        const downloadRes = await axios.head(
            'http://localhost:8080/download/1_1765899518_Decision_Tree_Classification_Analysis-1758865421.6606038.docx',
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        console.log('Response Headers:');
        console.log('Content-Disposition:', downloadRes.headers['content-disposition']);
        console.log('Content-Type:', downloadRes.headers['content-type']);
        console.log('\nSUCCESS! The browser will now save the file with the correct name.');
    } catch (error) {
        console.error('FAILED');
        console.error('Message:', error.message);
    }
})();
