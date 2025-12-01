package hotel

import (
	"fmt"
	"io"
	"net/http"
	"time"
)

type Storage struct {
	client http.Client
	url    string
}

func New(url string) *Storage {
	return &Storage{
		client: http.Client{Timeout: 5 * time.Second},
		url:    url,
	}
}

func (s *Storage) IsHotelOperational(hotelId string) bool {
	resp, err := s.client.Get(fmt.Sprintf("%s/api/hotels/%s/operational", s.url, hotelId))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if string(body) == "true" {
		return true
	}
	return false
}

func (s *Storage) IsHotelFullyBooked(hotelId string) bool {
	resp, err := s.client.Get(fmt.Sprintf("%s/api/hotels/%s/fully-booked", s.url, hotelId))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if string(body) == "true" {
		return true
	}
	return false
}
