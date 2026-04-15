package ent

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/logger"
)

func EntBootstrap(provider string, db *sql.DB, builder EntClientBuilder, autoMigrate bool) (any, error) {
	rawClient, err := InitEntClient(provider, db, builder)
	if err != nil {
		return nil, fmt.Errorf("init ent client failed: %w", err)
	}

	client := rawClient.(*generated.Client)
	// defer client.Close()

	if autoMigrate {
		if err := CreateSchemaWithLock(context.Background(), provider, db, func(ctx context.Context) error {
			return client.Schema.Create(ctx)
		}); err != nil {
			return nil, fmt.Errorf("auto create schema failed: %w", err)
		}
		logger.Info("📦 Ent schema created successfully")
	}

	return rawClient, nil
}
