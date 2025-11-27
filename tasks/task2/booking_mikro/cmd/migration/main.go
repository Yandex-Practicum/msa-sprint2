package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"

	_ "github.com/jackc/pgx/v4/stdlib"
	"github.com/pressly/goose/v3"
)

var (
	flags             = flag.NewFlagSet("goose", flag.ExitOnError)
	migrationsDirFlag = flags.String("migrations-dir", "", "directory with migration files, the same one that was imported, if passed MIGRATIONS_DIR env ignored")
	pgConnStrFlag     = flags.String("pg-conn-str", "", "postgres connection string, if passed, PG_CONN_STR env ignored")
)

func main() {
	err := run()
	if err != nil {
		log.Fatal(err)
	}
}

func run() error {
	err := flags.Parse(os.Args[1:])
	if err != nil {
		return fmt.Errorf("failed to parse command line arguments: %v\n", err)
	}
	pgConnStr := *pgConnStrFlag
	if pgConnStr == "" {
		pgConnStr = os.Getenv("PG_CONN_STR")
		if pgConnStr == "" {
			return errors.New("either flag -pg-conn-str or PG_CONN_STR env required")
		}
	}
	migrationsDir := *migrationsDirFlag
	if migrationsDir == "" {
		migrationsDir = os.Getenv("MIGRATIONS_DIR")
		if migrationsDir == "" {
			migrationsDir = "./migration/mainstorage"
		}
	}
	args := flags.Args()
	if len(args) < 1 {
		flags.Usage()
		return nil
	}
	command, commandArgs := args[0], args[1:]
	db, err := sql.Open("pgx", pgConnStr)
	if err != nil {
		return fmt.Errorf("failed to open database connect: %v\n", err)
	}
	defer func() {
		err = db.Close()
		if err != nil {
			log.Fatalf("failed to close database connect: %v\n", err)
		}
	}()
	err = goose.RunContext(context.Background(), command, db, migrationsDir, commandArgs...)
	if err != nil {
		return fmt.Errorf("goose %v: %v", command, err)
	}
	return nil
}
