const crypto = require('crypto');
const https = require('https');

class PaymentService {
  constructor() {
    // Đọc cấu hình MoMo từ .env
    this.accessKey = process.env.MOMO_ACCESS_KEY;
    this.secretKey = process.env.MOMO_SECRET_KEY;
    this.partnerCode = process.env.MOMO_PARTNER_CODE;
    this.baseUrl = process.env.MOMO_BASE_URL || 'https://test-payment.momo.vn';
    this.apiPath = '/v2/gateway/api/create';

    // Validate các biến môi trường bắt buộc
    this.validateConfig();
  }

  // Kiểm tra các biến môi trường bắt buộc
  validateConfig() {
    const requiredVars = [
      'MOMO_ACCESS_KEY',
      'MOMO_SECRET_KEY',
      'MOMO_PARTNER_CODE'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(
        `Thiếu các biến môi trường bắt buộc cho MoMo Payment: ${missingVars.join(', ')}\n` +
        `Vui lòng kiểm tra file .env trong thư mục backend.`
      );
    }
  }

  // Tạo signature cho request
  createSignature(rawSignature) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');
  }

  // Tạo payment URL từ MoMo
  async createPayment(bookingData) {
    try {
      const {
        amount,
        orderInfo,
        redirectUrl,
        ipnUrl,
        extraData = '' // extraData có thể là chuỗi rỗng hoặc JSON string
      } = bookingData;

      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('Amount phải là số dương hợp lệ');
      }

      // Đảm bảo amount là số nguyên
      const amountInt = Math.floor(parseInt(amount));

      // Tạo orderId và requestId theo mẫu MoMo
      const requestId = this.partnerCode + new Date().getTime();
      const orderId = requestId;
      const requestType = 'captureWallet';
      const lang = process.env.MOMO_LANG || 'vi';

      // extraData trong raw signature phải là chuỗi gốc (không base64)
      // Nếu extraData là JSON string, sử dụng trực tiếp
      // Nếu là base64, decode trước
      let extraDataString = extraData || '';
      
      if (extraDataString && extraDataString.length > 0) {
        // Kiểm tra xem có phải base64 không
        const isLikelyBase64 = !extraDataString.includes('{') && !extraDataString.includes('}') && 
                                !extraDataString.includes(':') && !extraDataString.includes('"');
        
        if (isLikelyBase64) {
          try {
            const decoded = Buffer.from(extraDataString, 'base64').toString('utf-8');
            JSON.parse(decoded); // Kiểm tra có phải JSON hợp lệ
            extraDataString = decoded;
          } catch (e) {
            // Không phải base64 hợp lệ, sử dụng trực tiếp
          }
        }
      }

      // Tạo raw signature theo format của MoMo
      // accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
      const rawSignature = 
        `accessKey=${this.accessKey}` +
        `&amount=${amountInt}` +
        `&extraData=${extraDataString}` +
        `&ipnUrl=${ipnUrl}` +
        `&orderId=${orderId}` +
        `&orderInfo=${orderInfo}` +
        `&partnerCode=${this.partnerCode}` +
        `&redirectUrl=${redirectUrl}` +
        `&requestId=${requestId}` +
        `&requestType=${requestType}`;
    
      console.log('--------------------RAW SIGNATURE----------------');
      console.log(rawSignature);

      // Tạo signature
      const signature = this.createSignature(rawSignature);
      console.log('--------------------SIGNATURE----------------');
      console.log(signature);

      // Tạo request body theo format của MoMo
      const requestBodyObj = {
        partnerCode: this.partnerCode,
        accessKey: this.accessKey,
        requestId: requestId,
        amount: amountInt.toString(),
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: redirectUrl,
        ipnUrl: ipnUrl,
        extraData: extraDataString, // Chuỗi gốc, không base64
        requestType: requestType,
        signature: signature,
        lang: lang
      };

      const requestBody = JSON.stringify(requestBodyObj);

      console.log('Request body to MoMo:', requestBody);

      // Gửi request đến MoMo
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'test-payment.momo.vn',
          port: 443,
          path: '/v2/gateway/api/create',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
          }
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              console.log('MoMo response status:', res.statusCode);
              console.log('MoMo response body:', data);
              
              const response = JSON.parse(data);
              
              if (response.resultCode === 0) {
                // Thành công, trả về payment URL
                resolve({
                  success: true,
                  paymentUrl: response.payUrl,
                  orderId: orderId,
                  requestId: requestId,
                  qrCodeUrl: response.qrCodeUrl || null
                });
              } else {
                console.error('MoMo error response:', response);
                reject(new Error(response.message || response.localMessage || 'Tạo payment URL thất bại'));
              }
            } catch (error) {
              console.error('Error parsing MoMo response:', error);
              console.error('Raw response:', data);
              reject(new Error('Lỗi parse response từ MoMo: ' + error.message));
            }
          });
        });

        req.on('error', (error) => {
          reject(new Error('Lỗi kết nối đến MoMo: ' + error.message));
        });

        req.write(requestBody);
        req.end();
      });
    } catch (error) {
      console.error('Error creating MoMo payment:', error);
      throw error;
    }
  }

  // Xác thực signature từ IPN callback
  verifySignature(data, signature) {
    const {
      amount,
      extraData = '',
      message,
      orderId,
      orderInfo,
      orderType,
      partnerCode,
      payType,
      requestId,
      responseTime,
      resultCode,
      transId
    } = data;

    // MoMo không gửi accessKey trong callback, sử dụng accessKey từ config
    const accessKey = this.accessKey;

    // Tạo raw signature theo format của MoMo IPN callback
    // Lưu ý: extraData trong signature phải là giá trị gốc (không base64)
    // Nhưng từ MoMo callback, extraData có thể đã là base64 hoặc JSON string
    let extraDataForSignature = extraData || '';
    
    // Nếu extraData là base64, decode trước khi tạo signature
    if (extraDataForSignature && !extraDataForSignature.includes('{')) {
      try {
        const decoded = Buffer.from(extraDataForSignature, 'base64').toString('utf-8');
        // Kiểm tra có phải JSON hợp lệ không
        JSON.parse(decoded);
        extraDataForSignature = decoded;
      } catch (e) {
        // Không phải base64, sử dụng trực tiếp
      }
    }

    const rawSignature = 
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraDataForSignature}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    console.log('--------------------IPN SIGNATURE VERIFICATION----------------');
    console.log('Raw signature for verification:', rawSignature);
    console.log('Received signature:', signature);
    console.log('Using accessKey from config:', accessKey);

    const calculatedSignature = this.createSignature(rawSignature);
    console.log('Calculated signature:', calculatedSignature);
    console.log('Signature match:', calculatedSignature === signature);

    return calculatedSignature === signature;
  }

  // Helper để debug signature format
  getExpectedSignatureFormat(data) {
    const {
      amount,
      extraData = '',
      message,
      orderId,
      orderInfo,
      orderType,
      partnerCode,
      payType,
      requestId,
      responseTime,
      resultCode,
      transId
    } = data;

    // Sử dụng accessKey từ config
    const accessKey = this.accessKey;

    let extraDataForSignature = extraData || '';
    if (extraDataForSignature && !extraDataForSignature.includes('{')) {
      try {
        const decoded = Buffer.from(extraDataForSignature, 'base64').toString('utf-8');
        JSON.parse(decoded);
        extraDataForSignature = decoded;
      } catch (e) {
        // Ignore
      }
    }

    return `accessKey=${accessKey}&amount=${amount}&extraData=${extraDataForSignature}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
  }
}

module.exports = new PaymentService();