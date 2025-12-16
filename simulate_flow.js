import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = 'http://localhost:8080';
const USER_EMAIL = 'testuser@example.com';
const ADMIN_EMAIL = 'admin@test.com';
const USER_PASS = 'testpass123';
const ADMIN_PASS = 'admin123';

const USER_DOC = "c:\\Users\\u\\Downloads\\frontend-react-main\\test doc\\Decision_Tree_Classification_Analysis-1758865421.6606038.docx";
const REPORT_1 = "c:\\Users\\u\\Downloads\\frontend-react-main\\test doc\\ai_report-1758865421.4377134.pdf";
const REPORT_2 = "c:\\Users\\u\\Downloads\\frontend-react-main\\test doc\\plag_report-1758865421.560418.pdf";

async function run() {
    try {
        console.log("0. Registering Users...");
        try {
            await axios.post(`${BASE_URL}/auth/signup`, { email: USER_EMAIL, password: USER_PASS });
            console.log("   User Registered.");
        } catch (e) { console.log("   User likely already exists."); }

        try {
            await axios.post(`${BASE_URL}/auth/signup`, { email: ADMIN_EMAIL, password: ADMIN_PASS });
            console.log("   Admin Registered.");
        } catch (e) { console.log("   Admin likely already exists."); }

        console.log("1. Logging in User...");
        const userLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: USER_EMAIL,
            password: USER_PASS
        });
        const userToken = userLogin.data.token;
        console.log("   User Token acquired.");

        console.log("2. Uploading User File...");
        const userForm = new FormData();
        userForm.append('payment_ref', 'TEST_REF');
        userForm.append('file', fs.createReadStream(USER_DOC));

        await axios.post(`${BASE_URL}/upload`, userForm, {
            headers: {
                ...userForm.getHeaders(),
                'Authorization': `Bearer ${userToken}`
            }
        });
        console.log("   User Upload Successful.");

        console.log("3. Logging in Admin...");
        const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASS
        });
        const adminToken = adminLogin.data.token;
        console.log("   Admin Token acquired.");

        console.log("4. Fetching Order ID...");
        const orders = await axios.get(`${BASE_URL}/admin/orders`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const orderId = orders.data[0].id; // Get most recent
        console.log(`   Found Order ID: ${orderId}`);

        console.log("5. Processing Order...");
        const adminForm = new FormData();
        adminForm.append('ai_score', '88');
        adminForm.append('sim_score', '12');
        adminForm.append('report1', fs.createReadStream(REPORT_1));
        adminForm.append('report2', fs.createReadStream(REPORT_2));

        await axios.post(`${BASE_URL}/admin/complete/${orderId}`, adminForm, {
            headers: {
                ...adminForm.getHeaders(),
                'Authorization': `Bearer ${adminToken}`
            }
        });
        console.log("   Order Completed Successfully.");

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Data:", error.response.data);
            console.error("Status:", error.response.status);
        }
        process.exit(1);
    }
}

run();
