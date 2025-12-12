package user

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

func (s *Storage) IsUserActive(userId string) bool {
	resp, err := s.client.Get(fmt.Sprintf("%s/api/users/%s/active", s.url, userId))
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

func (s *Storage) IsUserBlacklisted(userId string) bool {
	resp, err := s.client.Get(fmt.Sprintf("%s/api/users/%s/blacklisted", s.url, userId))
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

func (s *Storage) GetUserStatus(userId string) (string, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/api/users/%s/status", s.url, userId))
	if err != nil {
		return "", fmt.Errorf("GetUserStatus.client.Get: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)

	return string(body), nil
}
