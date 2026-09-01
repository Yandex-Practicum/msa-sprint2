
**GraphQL запросы для тестирования**

query {
  promoCodesByIds(codes: ["TESTCODE1", "TESTCODE2"]) {
    code
  },  
  bookingsByUser(userId: "test-user-3") {
    userId
    hotel {
      name
      id
      city
      stars
    }
  },
  hotelsByIds(ids: ["test-hotel-1", "test-hotel-2"]) {
    id
    name
    city
    stars
  }  
}


query {
  bookingsByUser(userId: "test-user-3") {
    userId
    hotel {
      name
      id
      city
      stars
    }
  },
  hotelsByIds(ids: ["test-hotel-1", "test-hotel-2"]) {
    id
    name
    city
    stars
  }  
}

query {
  bookingsByUser(userId: "test-user-3") {
    userId
    hotel {
      name
      id
      city
      stars
    }
    discountPercent
    discountInfo {
      isValid
      originalDiscount  
      finalDiscount
      description
    }
  },
}

query {
  validatePromoCode(code: "TESTCODE1", userId: "test-user-2") {
    description
    expiresAt
    finalDiscount
    isValid
    originalDiscount
  }
  promosByCodes(codes: "TESTCODE1") {
    code
    description
    discount
    expired
    isValid
    validUntil
    vipOnly
  }
}