package app

import (
	"fmt"
	"strings"
)

func JDBCToPg(jdbc, user, pass string) string {
	// если уже полная строка postgres:// ... — вернём как есть, только добавим sslmode
	j := strings.TrimPrefix(jdbc, "jdbc:")
	if strings.HasPrefix(j, "postgres://") || strings.HasPrefix(j, "postgresql://") {
		// нормализуем схему к postgres://
		j = "postgres://" + strings.TrimPrefix(strings.TrimPrefix(j, "postgres://"), "postgresql://")
		if !strings.Contains(j, "sslmode=") {
			if strings.Contains(j, "?") {
				j += "&sslmode=disable"
			} else {
				j += "?sslmode=disable"
			}
		}
		return j
	}
	// ожидаем host:port/db после jdbc:postgresql://
	host := strings.TrimPrefix(j, "postgresql://")
	host = strings.TrimPrefix(host, "postgres://")
	return fmt.Sprintf("postgres://%s:%s@%s?sslmode=disable", user, pass, host)
}
