import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import http from 'http';

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }

`;

const fetchBookingsFromService = (userId) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://hotelio-monolith:8080/api/bookings`);
    url.searchParams.append('userId', userId);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 8084,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 5000, // 5 секунд таймаут
    };
    
    console.log(`📡 Calling booking service: ${options.hostname}:${options.port}${options.path}`);
    
    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      
      // Проверяем статус ответа
      if (res.statusCode < 200 || res.statusCode >= 300) {
        console.error(`❌ Booking service responded with status: ${res.statusCode} ${res.statusMessage}`);
        reject(new Error(`Booking service error: ${res.statusCode} ${res.statusMessage}`));
        return;
      }
      
      // Собираем данные
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // Когда все данные получены
      res.on('end', () => {
        try {
          const bookings = JSON.parse(data);
          console.log(`✅ Received ${bookings?.length || 0} bookings from service`);
          resolve(Array.isArray(bookings) ? bookings : []);
        } catch (error) {
          console.error('❌ Failed to parse JSON response:', error.message);
          reject(new Error('Invalid JSON response from booking service'));
        }
      });
    });
    
    // Обработка ошибок
    req.on('error', (error) => {
      console.error('❌ HTTP request error:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('Booking service is unavailable'));
      } else if (error.code === 'ETIMEDOUT') {
        reject(new Error('Booking service timeout'));
      } else {
        reject(new Error(`HTTP request failed: ${error.message}`));
      }
    });
    
    // Таймаут
    req.on('timeout', () => {
      req.destroy();
      console.error('❌ Request timeout after 5 seconds');
      reject(new Error('Booking service timeout'));
    });
    
    // Завершаем запрос
    req.end();
  });
};

// ACL проверка на основе userId из заголовков
const checkBookingACL = (req, targetUserId) => {
  const authorizedUserId = req.headers.userid;
  
  if (!authorizedUserId) {
    console.error('Unauthorized: No userid header provided');
    throw new Error('Unauthorized: No userid header provided');
  }
  
  if (authorizedUserId !== targetUserId) {
    console.error(`Forbidden: User ${authoruthorizedUserId} tried to access bookings for user ${targetUserId}`);
    throw new Error('Forbidden: You can only access your own bookings');
  }
  
  return true;
};

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      try {
        console.log('\n🔍 GraphQL Query: bookingsByUser');
        console.log('Requested userId:', userId);
        console.log('userid header:', req?.headers?.userid);
                
        // Проверка ACL
        checkBookingACL(req, userId);
        
        // Вызов booking-сервиса через http
        const bookings = await fetchBookingsFromService(userId);
        
        // Фильтруем на случай если сервис вернул чужие данные
        const authorizedUserId = req.headers.userid;
        const filteredBookings = bookings.filter(booking => booking.userId === authorizedUserId);
        
        console.log(`✅ Returning ${filteredBookings.length} bookings`);
        
        return filteredBookings.map(booking => ({
          id: booking.id || `booking-${Math.random().toString(36).substr(2, 9)}`,
          userId: booking.userId,
          hotelId: booking.hotelId || 'hotel-unknown',
          promoCode: booking.promoCode || null,
          discountPercent: booking.discountPercent || 0,
        }));
      } catch (error) {
        console.error('❌ Error in bookingsByUser:', error.message);
        
        // Для ACL ошибок возвращаем пустой массив
        if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
          console.log('⚠️ ACL violation - returning empty array');
          return [];
        }
        
        // Для ошибок сервиса тоже возвращаем пустой массив
        console.log('⚠️ Service error - returning empty array');
        return [];
      }
    },
    
    debug: () => {
      return 'Booking subgraph is running. Use bookingsByUser(userId: "123") to test.';
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
  listen: { port: 4001 },
  context: async ({ req }) => ({ req }),
}).then(() => {
  console.log('✅ Booking subgraph ready at http://localhost:4001/');
});