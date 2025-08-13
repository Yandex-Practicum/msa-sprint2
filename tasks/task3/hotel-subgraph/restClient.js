/**
 * Простой REST-клиент для GET и POST запросов
 */
class RestClient {
  /**
   * Выполняет GET запрос
   * @param {string} url - URL для запроса
   * @param {Object} [headers={}] - Заголовки запроса
   * @returns {Promise<any>} - Ответ сервера
   */
  async get(url, headers = {}) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      return console.error('GET request failed:', error);
      
    }
  }

  /**
   * Выполняет POST запрос
   * @param {string} url - URL для запроса
   * @param {Object} data - Данные для отправки
   * @param {Object} [headers={}] - Заголовки запроса
   * @returns {Promise<any>} - Ответ сервера
   */
  async post(url, data, headers = {}) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('POST request failed:', error);
      throw error;
    }
  }
}

export const restClient = new RestClient();