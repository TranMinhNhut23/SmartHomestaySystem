const axios = require('axios');

class WeatherService {
  // API base URLs
  GEOCODING_API_BASE = 'https://geocoding-api.open-meteo.com/v1/search';
  WEATHER_API_BASE = 'https://api.open-meteo.com/v1/forecast';

  // Cache để tránh gọi API quá nhiều (thời tiết không thay đổi quá nhanh)
  // Cache trong 30 phút
  cache = new Map();
  CACHE_DURATION = 30 * 60 * 1000; // 30 phút

  // Tọa độ mặc định cho các tỉnh thành Việt Nam (fallback)
  VIETNAM_PROVINCES_COORDINATES = {
    'Hà Nội': { latitude: 21.0285, longitude: 105.8542 },
    'Hồ Chí Minh': { latitude: 10.8231, longitude: 106.6297 },
    'Thành phố Hồ Chí Minh': { latitude: 10.8231, longitude: 106.6297 },
    'Đà Nẵng': { latitude: 16.0544, longitude: 108.2022 },
    'Hải Phòng': { latitude: 20.8449, longitude: 106.6881 },
    'Cần Thơ': { latitude: 10.0452, longitude: 105.7469 },
    'An Giang': { latitude: 10.5216, longitude: 105.1259 },
    'Bà Rịa - Vũng Tàu': { latitude: 10.3460, longitude: 107.0843 },
    'Bắc Giang': { latitude: 21.2737, longitude: 106.1946 },
    'Bắc Kạn': { latitude: 22.1470, longitude: 105.8342 },
    'Bạc Liêu': { latitude: 9.2942, longitude: 105.7278 },
    'Bắc Ninh': { latitude: 21.1861, longitude: 106.0763 },
    'Bến Tre': { latitude: 10.2415, longitude: 106.3759 },
    'Bình Định': { latitude: 13.7750, longitude: 109.2233 },
    'Bình Dương': { latitude: 11.3254, longitude: 106.4770 },
    'Bình Phước': { latitude: 11.6471, longitude: 106.6056 },
    'Bình Thuận': { latitude: 10.9289, longitude: 108.1021 },
    'Cà Mau': { latitude: 9.1769, longitude: 105.1527 },
    'Cao Bằng': { latitude: 22.6657, longitude: 106.2571 },
    'Đắk Lắk': { latitude: 12.6662, longitude: 108.0500 },
    'Đắk Nông': { latitude: 12.0046, longitude: 107.6877 },
    'Điện Biên': { latitude: 21.4064, longitude: 103.0157 },
    'Đồng Nai': { latitude: 10.9574, longitude: 106.8429 },
    'Đồng Tháp': { latitude: 10.4930, longitude: 105.6882 },
    'Gia Lai': { latitude: 13.9833, longitude: 108.0000 },
    'Hà Giang': { latitude: 22.8333, longitude: 104.9833 },
    'Hà Nam': { latitude: 20.5411, longitude: 105.9220 },
    'Hà Tĩnh': { latitude: 18.3333, longitude: 105.9000 },
    'Hải Dương': { latitude: 20.9373, longitude: 106.3146 },
    'Hậu Giang': { latitude: 9.7844, longitude: 105.4706 },
    'Hòa Bình': { latitude: 20.8133, longitude: 105.3383 },
    'Hưng Yên': { latitude: 20.6464, longitude: 106.0511 },
    'Khánh Hòa': { latitude: 12.2388, longitude: 109.1967 },
    'Kiên Giang': { latitude: 9.9583, longitude: 105.0808 },
    'Kon Tum': { latitude: 14.3545, longitude: 108.0076 },
    'Lai Châu': { latitude: 22.3964, longitude: 103.4582 },
    'Lâm Đồng': { latitude: 11.9404, longitude: 108.4583 },
    'Lạng Sơn': { latitude: 21.8533, longitude: 106.7619 },
    'Lào Cai': { latitude: 22.4856, longitude: 103.9706 },
    'Long An': { latitude: 10.6086, longitude: 106.6714 },
    'Nam Định': { latitude: 20.4200, longitude: 106.1683 },
    'Nghệ An': { latitude: 18.6796, longitude: 105.6813 },
    'Ninh Bình': { latitude: 20.2539, longitude: 105.9750 },
    'Ninh Thuận': { latitude: 11.5643, longitude: 108.9886 },
    'Phú Thọ': { latitude: 21.3081, longitude: 105.3133 },
    'Phú Yên': { latitude: 13.0883, longitude: 109.0928 },
    'Quảng Bình': { latitude: 17.4687, longitude: 106.6227 },
    'Quảng Nam': { latitude: 15.8801, longitude: 108.3380 },
    'Quảng Ngãi': { latitude: 15.1167, longitude: 108.8000 },
    'Quảng Ninh': { latitude: 21.0064, longitude: 107.2925 },
    'Quảng Trị': { latitude: 16.7500, longitude: 107.2000 },
    'Sóc Trăng': { latitude: 9.6027, longitude: 105.9739 },
    'Sơn La': { latitude: 21.3257, longitude: 103.9167 },
    'Tây Ninh': { latitude: 11.3131, longitude: 106.0963 },
    'Thái Bình': { latitude: 20.4461, longitude: 106.3367 },
    'Thái Nguyên': { latitude: 21.5942, longitude: 105.8481 },
    'Thanh Hóa': { latitude: 19.8067, longitude: 105.7853 },
    'Thừa Thiên Huế': { latitude: 16.4637, longitude: 107.5909 },
    'Tiền Giang': { latitude: 10.3600, longitude: 106.3600 },
    'Trà Vinh': { latitude: 9.9347, longitude: 106.3453 },
    'Tuyên Quang': { latitude: 21.8183, longitude: 105.2119 },
    'Vĩnh Long': { latitude: 10.2537, longitude: 105.9722 },
    'Vĩnh Phúc': { latitude: 21.3081, longitude: 105.5967 },
    'Yên Bái': { latitude: 21.7051, longitude: 104.8697 }
  };

  /**
   * Lấy tọa độ (latitude, longitude) từ địa chỉ
   * @param {string} provinceName - Tên tỉnh/thành
   * @param {string} districtName - Tên quận/huyện (optional)
   * @param {string} wardName - Tên phường/xã (optional)
   * @returns {Promise<{latitude: number, longitude: number, name: string}>}
   */
  async getCoordinatesFromAddress(provinceName, districtName = null, wardName = null) {
    try {
      // Tạo query string để tìm kiếm
      let query = provinceName;
      if (districtName) {
        query = `${districtName}, ${provinceName}`;
      }
      if (wardName && districtName) {
        query = `${wardName}, ${districtName}, ${provinceName}`;
      }

      // Thêm "Vietnam" để tăng độ chính xác
      query = `${query}, Vietnam`;

      console.log('Geocoding query:', query);

      // Gọi Geocoding API
      const response = await axios.get(this.GEOCODING_API_BASE, {
        params: {
          name: query,
          count: 1,
          language: 'vi',
          format: 'json'
        },
        timeout: 10000
      });

      if (response.data && response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          latitude: result.latitude,
          longitude: result.longitude,
          name: result.name
        };
      }

      // Nếu không tìm thấy với đầy đủ địa chỉ, thử chỉ với tỉnh/thành
      if (districtName || wardName) {
        console.log('Retrying geocoding with province only:', provinceName);
        try {
          const fallbackResponse = await axios.get(this.GEOCODING_API_BASE, {
            params: {
              name: `${provinceName}, Vietnam`,
              count: 1,
              language: 'vi',
              format: 'json'
            },
            timeout: 10000
          });

          if (fallbackResponse.data && fallbackResponse.data.results && fallbackResponse.data.results.length > 0) {
            const result = fallbackResponse.data.results[0];
            return {
              latitude: result.latitude,
              longitude: result.longitude,
              name: result.name
            };
          }
        } catch (fallbackError) {
          console.error('Fallback geocoding error:', fallbackError.message);
        }
      }

      // Nếu vẫn không tìm thấy, sử dụng tọa độ mặc định từ danh sách
      if (this.VIETNAM_PROVINCES_COORDINATES[provinceName]) {
        console.log('Using default coordinates for province:', provinceName);
        const defaultCoords = this.VIETNAM_PROVINCES_COORDINATES[provinceName];
        return {
          latitude: defaultCoords.latitude,
          longitude: defaultCoords.longitude,
          name: provinceName
        };
      }

      // Nếu vẫn không có, thử tìm trong danh sách với tên gần giống
      const provinceKey = Object.keys(this.VIETNAM_PROVINCES_COORDINATES).find(key => 
        key.includes(provinceName) || provinceName.includes(key)
      );
      
      if (provinceKey) {
        console.log('Using default coordinates for similar province:', provinceKey);
        const defaultCoords = this.VIETNAM_PROVINCES_COORDINATES[provinceKey];
        return {
          latitude: defaultCoords.latitude,
          longitude: defaultCoords.longitude,
          name: provinceKey
        };
      }

      // Cuối cùng, sử dụng tọa độ trung tâm Việt Nam
      console.log('Using default coordinates for Vietnam center');
      return {
        latitude: 14.0583,
        longitude: 108.2772,
        name: provinceName || 'Việt Nam'
      };
    } catch (error) {
      console.error('Error geocoding address:', error.response?.data || error.message);
      
      // Thử sử dụng tọa độ mặc định
      if (provinceName && this.VIETNAM_PROVINCES_COORDINATES[provinceName]) {
        console.log('Using default coordinates due to geocoding error:', provinceName);
        const defaultCoords = this.VIETNAM_PROVINCES_COORDINATES[provinceName];
        return {
          latitude: defaultCoords.latitude,
          longitude: defaultCoords.longitude,
          name: provinceName
        };
      }

      // Nếu không có trong danh sách, sử dụng tọa độ trung tâm Việt Nam
      console.log('Using Vietnam center coordinates as fallback');
      return {
        latitude: 14.0583,
        longitude: 108.2772,
        name: provinceName || 'Việt Nam'
      };
    }
  }

  /**
   * Lấy thời tiết hiện tại từ Open-Meteo
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {Promise<Object>}
   */
  async getCurrentWeather(latitude, longitude) {
    try {
      const cacheKey = `weather_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
      const cached = this.cache.get(cacheKey);
      
      // Kiểm tra cache
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        console.log('Using cached weather data for:', latitude, longitude);
        return cached.data;
      }

      console.log('Fetching fresh weather data for:', latitude, longitude);

      // Gọi Weather API với forecast 7 ngày
      const response = await axios.get(this.WEATHER_API_BASE, {
        params: {
          latitude: latitude,
          longitude: longitude,
          current_weather: true,
          timezone: 'Asia/Ho_Chi_Minh',
          daily: 'temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,windspeed_10m_max',
          forecast_days: 7
        },
        timeout: 10000
      });

      if (response.data && response.data.current_weather) {
        // Xử lý dữ liệu forecast 7 ngày
        const daily = response.data.daily || {};
        const forecast = [];
        
        if (daily.time && Array.isArray(daily.time)) {
          for (let i = 0; i < Math.min(7, daily.time.length); i++) {
            forecast.push({
              date: daily.time[i],
              temperatureMax: daily.temperature_2m_max?.[i] || null,
              temperatureMin: daily.temperature_2m_min?.[i] || null,
              weathercode: daily.weathercode?.[i] || null,
              precipitation: daily.precipitation_sum?.[i] || 0,
              windspeedMax: daily.windspeed_10m_max?.[i] || null
            });
          }
        }

        const weatherData = {
          current: {
            temperature: response.data.current_weather.temperature,
            weathercode: response.data.current_weather.weathercode,
            windspeed: response.data.current_weather.windspeed,
            winddirection: response.data.current_weather.winddirection,
            time: response.data.current_weather.time
          },
          forecast: forecast, // Forecast 7 ngày
          daily: response.data.daily || null,
          location: {
            latitude: response.data.latitude,
            longitude: response.data.longitude
          }
        };

        // Lưu vào cache
        this.cache.set(cacheKey, {
          data: weatherData,
          timestamp: Date.now()
        });

        return weatherData;
      }

      throw new Error('Không thể lấy dữ liệu thời tiết');
    } catch (error) {
      console.error('Error fetching weather:', error.response?.data || error.message);
      
      // Nếu có cache cũ, trả về cache đó thay vì throw error
      const cacheKey = `weather_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('Returning stale cache due to API error');
        return cached.data;
      }
      
      throw new Error('Không thể lấy dữ liệu thời tiết: ' + (error.response?.data?.error || error.message));
    }
  }

  /**
   * Lấy thời tiết theo địa chỉ
   * @param {string} provinceName 
   * @param {string} districtName 
   * @param {string} wardName 
   * @returns {Promise<Object>}
   */
  async getWeatherByAddress(provinceName, districtName = null, wardName = null) {
    try {
      // Lấy tọa độ từ địa chỉ
      const coordinates = await this.getCoordinatesFromAddress(provinceName, districtName, wardName);
      
      // Lấy thời tiết
      const weather = await this.getCurrentWeather(coordinates.latitude, coordinates.longitude);
      
      return {
        ...weather,
        locationName: coordinates.name
      };
    } catch (error) {
      console.error('Error getting weather by address:', error);
      throw error;
    }
  }

  /**
   * Chuyển đổi weathercode sang mô tả thời tiết
   * @param {number} code 
   * @returns {Object} {icon: string, description: string}
   */
  getWeatherDescription(code) {
    // WMO Weather interpretation codes (WW)
    // https://open-meteo.com/en/docs
    if (code === 0) return { icon: 'sunny', description: 'Trời quang', emoji: '☀️' };
    if (code >= 1 && code <= 3) return { icon: 'partly-sunny', description: 'Nhiều mây', emoji: '⛅' };
    if (code === 45 || code === 48) return { icon: 'cloudy', description: 'Sương mù', emoji: '🌫️' };
    if (code >= 51 && code <= 55) return { icon: 'rainy', description: 'Mưa phùn', emoji: '🌦️' };
    if (code >= 56 && code <= 57) return { icon: 'snow', description: 'Mưa đá', emoji: '🌨️' };
    if (code >= 61 && code <= 65) return { icon: 'rainy', description: 'Mưa', emoji: '🌧️' };
    if (code >= 66 && code <= 67) return { icon: 'snow', description: 'Mưa đá', emoji: '🌨️' };
    if (code >= 71 && code <= 75) return { icon: 'snow', description: 'Tuyết rơi', emoji: '❄️' };
    if (code === 77) return { icon: 'snow', description: 'Hạt tuyết', emoji: '❄️' };
    if (code >= 80 && code <= 82) return { icon: 'rainy', description: 'Mưa rào', emoji: '⛈️' };
    if (code >= 85 && code <= 86) return { icon: 'snow', description: 'Tuyết rơi', emoji: '❄️' };
    if (code === 95) return { icon: 'thunderstorm', description: 'Dông', emoji: '⛈️' };
    if (code >= 96 && code <= 99) return { icon: 'thunderstorm', description: 'Dông kèm mưa đá', emoji: '⛈️' };
    
    return { icon: 'partly-sunny', description: 'Không xác định', emoji: '🌤️' };
  }
}

module.exports = new WeatherService();

