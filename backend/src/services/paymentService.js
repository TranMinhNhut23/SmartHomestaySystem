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

    // Đọc cấu hình VNPay từ .env
    this.vnp_TmnCode = process.env.VNPAY_TMN_CODE;
    this.vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
    // VNPay Gateway URLs
    const VNPAY_GATEWAY_SANDBOX_HOST = 'https://sandbox.vnpayment.vn';
    const PAYMENT_ENDPOINT = 'paymentv2/vpcpay.html';
    this.vnp_Url = process.env.VNPAY_URL || `${VNPAY_GATEWAY_SANDBOX_HOST}/${PAYMENT_ENDPOINT}`;
    this.vnp_ApiUrl = process.env.VNPAY_API_URL || `${VNPAY_GATEWAY_SANDBOX_HOST.replace('https://', 'http://')}/merchant_webapi/merchant.html`;

    // Validate các biến môi trường bắt buộc
    this.validateConfig();
  }

  // Kiểm tra các biến môi trường bắt buộc
  validateConfig() {
    // Chỉ validate khi thực sự sử dụng (không bắt buộc phải có cả MoMo và VNPay)
    // Có thể comment lại nếu không muốn throw error ngay khi start
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

  // ==================== VNPAY METHODS ====================

  // Hàm encode giống urlencode() trong PHP
  // PHP urlencode() encode space thành +, không phải %20
  urlEncode(str) {
    return encodeURIComponent(str).replace(/%20/g, '+');
  }

  // Tạo payment URL từ VNPay
  createVNPayPaymentUrl(bookingData) {
    try {
      const {
        bookingId,
        amount,
        orderInfo
      } = bookingData;

      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('Amount phải là số dương hợp lệ');
      }

      // Kiểm tra cấu hình VNPay
      if (!this.vnp_TmnCode || !this.vnp_HashSecret) {
        const missingConfig = [];
        if (!this.vnp_TmnCode) missingConfig.push('VNPAY_TMN_CODE');
        if (!this.vnp_HashSecret) missingConfig.push('VNPAY_HASH_SECRET');
        throw new Error(`Thiếu cấu hình VNPay: ${missingConfig.join(', ')}. Vui lòng kiểm tra file .env`);
      }

      // Lấy IP address và đảm bảo là IPv4 format
      let vnp_IpAddr = bookingData.ipAddr || '127.0.0.1';
      
      // VNPay chỉ chấp nhận IPv4, không chấp nhận IPv6
      // Convert IPv6-mapped IPv4 về IPv4
      if (vnp_IpAddr.startsWith('::ffff:')) {
        vnp_IpAddr = vnp_IpAddr.replace('::ffff:', '');
      }
      
      // Nếu vẫn là IPv6, dùng IP mặc định
      if (vnp_IpAddr.includes(':')) {
        console.warn('⚠️ IPv6 address detected in payment service, using default IP:', vnp_IpAddr);
        vnp_IpAddr = '127.0.0.1';
      }

      // Tạo TxnRef: bookingId + timestamp
      const vnp_TxnRef = bookingId.toString() + Date.now();

      // Amount phải nhân 100 (VNPay yêu cầu số tiền tính bằng xu)
      // Đảm bảo là số nguyên
      const vnp_Amount = Math.floor(Number(amount) * 100);

      // Tạo CreateDate theo format VNPay: YYYYMMDDHHmmss
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const vnp_CreateDate = `${year}${month}${day}${hours}${minutes}${seconds}`;

      // Tạo input data theo format VNPay
      // Lưu ý: Tất cả giá trị phải là string hoặc number (không được null/undefined)
      const inputData = {
        vnp_Version: '2.1.0',
        vnp_TmnCode: String(this.vnp_TmnCode),
        vnp_Amount: String(vnp_Amount), // Chuyển sang string
        vnp_Command: 'pay',
        vnp_CreateDate: vnp_CreateDate,
        vnp_CurrCode: 'VND',
        vnp_IpAddr: String(vnp_IpAddr),
        vnp_Locale: 'vn',
        vnp_OrderInfo: String(orderInfo || `Thanh toan don hang #${bookingId.toString().slice(-8)}`),
        vnp_OrderType: 'other',
        vnp_ReturnUrl: String(bookingData.returnUrl),
        vnp_TxnRef: String(vnp_TxnRef)
      };

      // Sắp xếp các key theo thứ tự alphabet
      const sortedKeys = Object.keys(inputData).sort();
      
      // Tạo query string và hashdata
      let query = '';
      let hashdata = '';
      let i = 0;

      sortedKeys.forEach(key => {
        const value = inputData[key];
        // Chỉ thêm các giá trị không rỗng (tương tự !empty() trong PHP)
        // Lưu ý: VNPay yêu cầu loại bỏ các giá trị rỗng, null, undefined
        if (value !== null && value !== undefined && value !== '') {
          // Convert value sang string để đảm bảo format đúng
          const valueStr = String(value);
          
          // Encode theo format VNPay (giống urlencode trong PHP)
          // PHP urlencode() encode space thành +, không phải %20
          // Dùng hàm urlEncode() để đảm bảo format giống PHP
          const encodedKey = this.urlEncode(key);
          const encodedValue = this.urlEncode(valueStr);
          
          if (i === 0) {
            hashdata += `${encodedKey}=${encodedValue}`;
            query += `${encodedKey}=${encodedValue}`;
            i = 1;
          } else {
            hashdata += `&${encodedKey}=${encodedValue}`;
            query += `&${encodedKey}=${encodedValue}`;
          }
        }
      });

      // Tạo SecureHash bằng HMAC SHA512
      // Lưu ý: hashdata phải là chuỗi raw (không encode thêm lần nữa)
      const vnpSecureHash = crypto
        .createHmac('sha512', this.vnp_HashSecret)
        .update(hashdata)
        .digest('hex');

      // Tạo payment URL
      const vnp_Url = `${this.vnp_Url}?${query}&vnp_SecureHash=${vnpSecureHash}`;

      // Debug logging chi tiết
      console.log('====================VNPAY REQUEST====================');
      console.log('VNPay Config:');
      console.log('  - TmnCode:', this.vnp_TmnCode);
      console.log('  - HashSecret:', this.vnp_HashSecret ? '***' + this.vnp_HashSecret.slice(-4) : 'MISSING');
      console.log('  - Payment URL:', this.vnp_Url);
      console.log('Input Data:', JSON.stringify(inputData, null, 2));
      console.log('Sorted Keys:', sortedKeys);
      console.log('Hash Data String:', hashdata);
      console.log('Secure Hash:', vnpSecureHash);
      console.log('Final Payment URL:', vnp_Url);
      console.log('====================================================');

      return {
        success: true,
        paymentUrl: vnp_Url,
        txnRef: vnp_TxnRef,
        amount: vnp_Amount
      };
    } catch (error) {
      console.error('====================VNPAY ERROR====================');
      console.error('Error creating VNPay payment URL:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Booking Data:', JSON.stringify(bookingData, null, 2));
      console.error('====================================================');
      // Thêm thông tin debug vào error message
      const errorMessage = error.message || 'Tạo payment URL thất bại';
      const debugInfo = {
        message: errorMessage,
        config: {
          hasTmnCode: !!this.vnp_TmnCode,
          hasHashSecret: !!this.vnp_HashSecret,
          paymentUrl: this.vnp_Url
        }
      };
      const enhancedError = new Error(`${errorMessage}. Debug: ${JSON.stringify(debugInfo)}`);
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }

  // Xác thực payment từ VNPay callback
  verifyVNPayPayment(vnpayData) {
    try {
      // Add debug logging
      console.log('--------------------VNPAY VERIFICATION----------------');
      console.log('Received VNPay data:', JSON.stringify(vnpayData, null, 2));

      const vnp_SecureHash = vnpayData.vnp_SecureHash || '';
      const vnp_ResponseCode = vnpayData.vnp_ResponseCode || '';
      const vnp_TxnRef = vnpayData.vnp_TxnRef || '';
      const vnp_Amount = vnpayData.vnp_Amount || 0;

      // Tạo inputData từ vnpayData (loại bỏ vnp_SecureHash)
      const inputData = {};
      Object.keys(vnpayData).forEach(key => {
        if (key.startsWith('vnp_') && key !== 'vnp_SecureHash') {
          inputData[key] = vnpayData[key];
        }
      });

      // Sắp xếp các key theo thứ tự alphabet
      const sortedKeys = Object.keys(inputData).sort();

      // Tạo hashdata để verify
      let hashData = '';
      let i = 0;

      sortedKeys.forEach(key => {
        const value = inputData[key];
        if (value !== null && value !== undefined && value !== '') {
          // Dùng urlEncode() để giống format PHP urlencode()
          const encodedKey = this.urlEncode(key);
          const encodedValue = this.urlEncode(String(value));
          
          if (i === 0) {
            hashData += `${encodedKey}=${encodedValue}`;
            i = 1;
          } else {
            hashData += `&${encodedKey}=${encodedValue}`;
          }
        }
      });

      // Tạo SecureHash bằng HMAC SHA512
      const secureHash = crypto
        .createHmac('sha512', this.vnp_HashSecret)
        .update(hashData)
        .digest('hex');

      // Add debug logging for hash comparison
      console.log('====================VNPAY VERIFICATION DETAILS====================');
      console.log('Input Data:', JSON.stringify(inputData, null, 2));
      console.log('Sorted Keys:', sortedKeys);
      console.log('Hash Data String:', hashData);
      console.log('Generated Hash:', secureHash);
      console.log('Received Hash:', vnp_SecureHash);
      console.log('Hash Match:', secureHash === vnp_SecureHash);
      console.log('Hash Secret (last 4):', this.vnp_HashSecret ? '***' + this.vnp_HashSecret.slice(-4) : 'MISSING');
      console.log('===============================================================');

      const isVerified = secureHash === vnp_SecureHash;
      
      if (!isVerified) {
        console.error('❌ SIGNATURE VERIFICATION FAILED!');
        console.error('Possible causes:');
        console.error('  1. VNPAY_HASH_SECRET không đúng');
        console.error('  2. Hash data string không đúng format');
        console.error('  3. Các giá trị trong inputData bị thay đổi');
        console.error('  4. Encoding không đúng');
      }

      return {
        verified: isVerified,
        response_code: vnp_ResponseCode,
        txn_ref: vnp_TxnRef,
        amount: vnp_Amount / 100, // Chuyển từ xu về VND
        debug: {
          hashMatch: isVerified,
          generatedHash: secureHash,
          receivedHash: vnp_SecureHash,
          hashData: hashData
        }
      };
    } catch (error) {
      console.error('====================VNPAY VERIFICATION ERROR====================');
      console.error('Error verifying VNPay payment:', error.message);
      console.error('Error stack:', error.stack);
      console.error('VNPay Data:', JSON.stringify(vnpayData, null, 2));
      console.error('===============================================================');
      return {
        verified: false,
        response_code: '99',
        txn_ref: '',
        amount: 0,
        error: error.message
      };
    }
  }
}

module.exports = new PaymentService();