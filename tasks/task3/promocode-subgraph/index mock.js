import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import http from 'http';

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
  }

  type DiscountInfo {
    isValid: Boolean!
    originalDiscount: Float!    # Исходное значение из booking
    finalDiscount: Float!       # Актуальное значение после проверки
    description: String
    expiresAt: String
    applicableHotels: [ID!]!
  }
  
  type Query {
    validatePromoCode(code: String!, hotelId: ID): DiscountInfo!
    activePromoCodes: [DiscountInfo!]!
  }
`;
/*
INSERT INTO hotel (id, operational, fully_booked, city, rating, description) VALUES
  ('test-hotel-1', true, false, 'Seoul', 4.7, 'Modern hotel in Seoul downtown with spa and skybar.'),
  ('test-hotel-2', true, true, 'Busan', 4.5, 'Luxury beach resort in Busan with ocean view.'),
  ('test-hotel-3', false, false, 'Daegu', 3.8, 'Affordable business hotel in Daegu center.');
*/
const db = {
  promocodes : [
    {
      "code": "TESTCODE1",
      "discount": 10.0,
      "vip_only": false,
      "expired" : false,
      "valid_until": "2099-12-31",
      "description": "Обычный промокод"
    },
    {
      "code": "TESTCODE-VIP",
      "discount": 20.0,
      "vip_only": true,
      "expired" : false,
      "valid_until": "2099-12-31",
      "description": "Только для VIP"
    },
    {
      "code": "TESTCODE1",
      "discount": 5.0,
      "vip_only": false,
      "expired" : true,
      "valid_until": "2000-12-31",
      "description": "Истёкший промокод"
    }
  ],
  hotels: [
    {
      "id": "test-hotel-1",
      "operational": true,
      "fully_booked": false,
      "city" : "Seoul",
      "rating": 4.7,
      "description": "Modern hotel in Seoul downtown with spa and skybar."
    },
    {
      "id": "test-hotel-1",
      "operational": true,
      "fully_booked": true,
      "city" : "Busan",
      "rating": 4.5,
      "description": "Luxury beach resort in Busan with ocean view."
    },
    {
      "id": "test-hotel-1",
      "operational": false,
      "fully_booked": false,
      "city" : "Daegu",
      "rating": 3.8,
      "description": "Affordable business hotel in Daegu center."
    }
  ]
}

const fetchHotelFromService = (hotelId) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://hotelio-monolith:8080/api/hotel`);
    url.searchParams.append('hotelId', hotelId);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 8080,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 5000, // 5 секунд таймаут
    };
    
    console.log(`📡 Calling hotel service: ${options.hostname}:${options.port}${options.path}`);
    
    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      
      // Проверяем статус ответа
      if (res.statusCode < 200 || res.statusCode >= 300) {
        console.error(`❌ Hotel service responded with status: ${res.statusCode} ${res.statusMessage}`);
        reject(new Error(`Hotel service error: ${res.statusCode} ${res.statusMessage}`));
        return;
      }
      
      // Собираем данные
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // Когда все данные получены
      res.on('end', () => {
        try {
          const hotel = JSON.parse(data);
          console.log(`✅ Received ${hotel || 0} hotel from service`);
          resolve(hotel);
        } catch (error) {
          console.error('❌ Failed to parse JSON response:', error.message);
          reject(new Error('Invalid JSON response from hotel service'));
        }
      });
    });
    
    // Обработка ошибок
    req.on('error', (error) => {
      console.error('❌ HTTP request error:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('Promocode service is unavailable'));
      } else if (error.code === 'ETIMEDOUT') {
        reject(new Error('Promocode service timeout'));
      } else {
        reject(new Error(`HTTP request failed: ${error.message}`));
      }
    });
    
    // Таймаут
    req.on('timeout', () => {
      req.destroy();
      console.error('❌ Request timeout after 5 seconds');
      reject(new Error('Promocode service timeout'));
    });
    
    // Завершаем запрос
    req.end();
  });
};

const resolvers = {
  Query: {
    validatePromocode: async (_, { code, hotelId }, { req }) => {
      try {
        console.log('\n🔍 GraphQL Query: validatePromocode');
        console.log('Requested code:', code);
        console.log('Requested hotelId:', hotelId);
                
        // Вызов promoCode-сервиса через http
        const promocode = await fetchPromocodeFromService(code);
        console.log(`✅ Returning promocode: ${JSON.stringify(promocode)}`);
        // Вызов hotel-сервиса через http
        const hotel = await fetchHotelFromService(hotelId);
        console.log(`✅ Returning hotel:${JSON.stringify(hotel)}`);
        


        const isValid = promocode !== undefined;
        return {
          isValid: isValid,
          code: code,
          discount: promocode.discount,
          vipOnly: promocode.vipOnly,
          expired: promocode.expired,
          validUntil: promocode.validUntil,
          description: promocode.description
        };
      } catch (error) {
        console.error('❌ Error in validatePromocode:', error.message);
        return {};
      }
    },
    
    debug: () => {
      return 'Promocode subgraph is running. Use validatePromocode(code: "TESTCODE1") to test.';
    }
  },
  
  Booking: {
    __resolveReference: async (reference, { req }) => {
      try {
        console.log('\n🔗 Resolving Booking reference:', reference.id);
        
        const authorizedUserId = req.headers.userid;
        
        if (!authorizedUserId) {
          console.error('Unauthorized: No userid header');
          return null;
        }
        
        // Для __resolveReference также делаем http запрос к booking service
        // Получаем все бронирования пользователя и находим нужное
        const bookings = await fetchBookingsFromService(authorizedUserId);
        const booking = bookings.find(b => b.id === reference.id);
        
        if (!booking) {
          console.log(`Booking ${reference.id} not found for user ${authorizedUserId}`);
          return null;
        }
        
        // Проверяем, что бронирование принадлежит пользователю
        if (booking.userId !== authorizedUserId) {
          console.error(`Forbidden: Booking ${reference.id} belongs to different user`);
          return null;
        }
        
        return {
          id: booking.id,
          userId: booking.userId,
          hotelId: booking.hotelId,
          promoCode: booking.promoCode || null,
          discountPercent: booking.discountPercent || 0,
        };
      } catch (error) {
        console.error('Error in Booking.__resolveReference:', error.message);
        return null;
      }
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4003 },
  context: async ({ req }) => ({ req }),
}).then(() => {
  console.log('✅ Promocode subgraph ready at http://localhost:4003/');
});