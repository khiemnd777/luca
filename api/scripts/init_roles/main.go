package main

import (
	"fmt"

	"github.com/khiemnd777/noah_api/shared/bootstrap"
	"github.com/khiemnd777/noah_api/shared/config"
	"github.com/khiemnd777/noah_api/shared/utils"
)

func main() {
	cfgerr := config.Init(utils.GetAppConfigPath())
	if cfgerr != nil {
		panic(fmt.Sprintf("❌ Config not initialized: %v", cfgerr))
	}

	if err := bootstrap.EnsureBaseRolesAndPermissions(config.Get().Database); err != nil {
		panic(fmt.Sprintf("❌ Failed to seed base roles: %v", err))
	}
}
