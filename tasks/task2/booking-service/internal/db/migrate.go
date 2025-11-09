package db

import (
	"database/sql"
	"os"
)

func MustApplyMigrations(db *sql.DB) {
	paths := []string{"/app/migrations/001_init.sql", "internal/db/migrations/001_init.sql"}
	var b []byte
	var err error
	for _, p := range paths {
		b, err = os.ReadFile(p)
		if err == nil {
			break
		}
	}
	if err != nil {
		panic(err)
	}
	if _, err := db.Exec(string(b)); err != nil {
		panic(err)
	}
}
