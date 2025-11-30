// Script để test IPN callback manually với data thật từ logs
const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000'; // Test local trước

// Data từ logs của user
const testData = {
  partnerCode: 'MOMO',
  orderId: 'MOMO1763785308078',
  requestId: 'MOMO1763785308078',
  amount: 50000,
  orderInfo: 'Nạp tiền vào ví - Số tiền: 50.000 VND',
  orderType: 'momo_wallet',
  transId: '4613484398',
  resultCode: 0, // MoMo gửi là number
  message: 'Thành công.',
  payType: 'webApp',
  responseTime: 1763785320745,
  extraData: '{"userId":"691350ec58dbfc1844e9364b","walletId":"692132a6fa2773b4fb0f98d4","type":"deposit","timestamp":1763785308062}',
  signature: '9d0789f483ab68770a5c343f87539e2f6fc5913bbaf1bae774492bcb6f3059c7'
};

async function testIPN() {
  try {
    console.log('🧪 Testing IPN callback...');
    console.log('URL:', `${BACKEND_URL}/api/wallet/deposit/momo/callback`);
    
    const response = await axios.post(
      `${BACKEND_URL}/api/wallet/deposit/momo/callback`,
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n✅ Response:', response.status);
    console.log('Data:', response.data);
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

testIPN();

