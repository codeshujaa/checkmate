const axios = require('axios');

(async () => {
    try {
        console.log('1. Logging in as admin...');
        const loginRes = await axios.post('http://localhost:8080/auth/login', {
            email: 'admin@test.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('   ✓ Login successful\n');

        console.log('2. Testing download with original filename...');
        const downloadRes = await axios.get(
            'http://localhost:8080/download/Decision_Tree_Classification_Analysis-1758865421.6606038.docx',
            {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob'
            }
        );

        console.log('\n=== RESPONSE HEADERS ===');
        console.log('All headers:', JSON.stringify(downloadRes.headers, null, 2));
        console.log('\n=== KEY HEADERS ===');
        console.log('content-disposition:', downloadRes.headers['content-disposition']);
        console.log('content-type:', downloadRes.headers['content-type']);
        console.log('content-length:', downloadRes.headers['content-length']);

        if (downloadRes.headers['content-disposition']) {
            const match = downloadRes.headers['content-disposition'].match(/filename="?(.+?)"?$/);
            console.log('\n=== FILENAME EXTRACTION ===');
            console.log('Regex match:', match);
            console.log('Extracted filename:', match ? match[1] : 'NO MATCH');
        } else {
            console.log('\n⚠️  NO Content-Disposition header found!');
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    }
})();
