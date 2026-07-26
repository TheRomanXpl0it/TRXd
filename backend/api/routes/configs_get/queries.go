package configs_get

import (
	"context"
	"fmt"
	"strings"
	"trxd/db"
	"trxd/db/sqlc"
	"trxd/utils/consts"
)

func GetConfigs(ctx context.Context) ([]sqlc.Config, error) {
	unsortedConfigs, err := db.Sql.GetConfigs(ctx)
	if err != nil {
		return nil, err
	}

	confs := make([]sqlc.Config, len(unsortedConfigs))
	for _, conf := range unsortedConfigs {
		i, ok := consts.ConfigsSortOrder[conf.Key]
		if !ok {
			return nil, fmt.Errorf("%s: %s", strings.ToLower(consts.ConfigNotFound), conf.Key)
		}
		confs[i] = conf
	}

	return confs, nil
}
