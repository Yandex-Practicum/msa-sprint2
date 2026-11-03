package com.hotelio.history.repository;

public interface BookingStatsView {

    String getDimension();

    long getBookings();

    double getRevenue();

    double getDiscounts();
}
