package storage

import "errors"

var (
	ErrBookingExists = errors.New("booking already exists")
	ErrDataNotFound  = errors.New("data not found")
)
