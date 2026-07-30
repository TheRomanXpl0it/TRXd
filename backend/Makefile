END		= \033[0m
YELLOW	= \033[33m


default:
	@echo "${YELLOW}[Warn] This makefile is not to built, but for testing purposes only.${END}"

sqlc:
	@sqlc generate
sql: sqlc

sqlc-diff:
	@sqlc diff
sql-diff: sqlc-diff

docs:
	@swag init -g ./api/api.go -o ./docs

run:
	@ALLOW_REGISTER=true RECLAIM_INSTANCE_INTERVAL=1 go run . -test-data-WARNING-DO-NOT-USE-IN-PRODUCTION
	@go run .

test:
	@REDIS_DISABLE=true go test -v ./...

py-test:
	@go build .
	@cd ../tests/backend/ && (./run.sh || (kill $$(pidof trxd) && exit 1))

roast:
	@droast ../Dockerfile

lint:
	@go vet ./...
	@ineffassign ./...
	@gocyclo -ignore "sqlc|_test|test_" -over 15 .
	@misspell -error .
	@golangci-lint run

cyclo:
	@gocyclo -ignore "sqlc|_test|test_" -top 15 .

pipe: sqlc-diff docs roast lint test py-test


.PHONY: default sqlc sql sqlc-diff sql-diff docs run test py-test lint cyclo roast pipe
