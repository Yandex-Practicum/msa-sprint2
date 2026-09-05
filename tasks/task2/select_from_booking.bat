echo "Select bookings from monolith"
docker exec -it hotelio-db psql -U hotelio -d hotelio_db -c "SELECT * FROM booking;"

echo "Select bookings from booking-service"
docker exec -it booking-service-db psql -U booking-service -d booking-service_db -c "SELECT * FROM booking;"

echo "Select bookings from booking-history-service"
docker exec -it booking-history-db psql -U booking-history -d booking-history_db -c "SELECT * FROM booking;"