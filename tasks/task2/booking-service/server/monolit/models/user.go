package models

type User struct {
	ID          string `json:"id"`
	Status      string `json:"status"`
	Blacklisted bool   `json:"blacklisted"`
	Active      bool   `json:"active"`
}
