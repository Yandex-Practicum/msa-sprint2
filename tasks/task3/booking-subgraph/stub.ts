export const bookingStoreData = [
  {
    id: 1,
    userId: "test-user-2",
    hotelId: "test-hotel-1",
    promoCode: "TESTCODE1",
    discountPercent: 0,
  },
  {
    id: 2,
    userId: "test-user-1",
    hotelId: "test-hotel-1",
    promoCode: "TESTCODE1",
    discountPercent: 0,
  },
  {
    id: 3,
    userId: "test-user-3",
    hotelId: "test-hotel-1",
    promoCode: "TESTCODE1",
    discountPercent: 0,
  },
  {
    id: 4,
    userId: "test-user-1",
    hotelId: "test-hotel-1",
    promoCode: "TESTCODE1",
    discountPercent: 0,
  },
  {
    id: 5,
    userId: "test-user-3",
    hotelId: "test-hotel-1",
    promoCode: "TESTCODE1",
    discountPercent: 0,
  },
  {
    id: 6,
    userId: "test-user-2",
    hotelId: "test-hotel-1",
    promoCode: "TESTCODE1",
    discountPercent: 0,
  },
];

type BookingType = {
  id: number;
  userId: string;
  hotelId: string;
  promoCode: string;
  discountPercent: number;
};

interface IUserStub {
  _bookingsList: BookingType[];

  setBookingsList: (bookingsList: BookingType[]) => void;
  getBookingsList: () => BookingType[];
  getBookingsListByUserId: (userId: string) => BookingType[];
}

class UserStub implements IUserStub {
  _bookingsList: BookingType[] = [];

  constructor(bookingsList: BookingType[]) {
    this._bookingsList = bookingsList;
  }

  setBookingsList(bookingsList: BookingType[]): void {
    this._bookingsList = bookingsList;
  }

  getBookingsList(): BookingType[] {
    return this._bookingsList;
  }

  getBookingsListByUserId(userId: string): BookingType[] {
    return this._bookingsList.filter((_booking) => _booking.userId === userId);
  }
}

export const UserStubInstance = new UserStub(bookingStoreData);
