.PHONY: docker-fetch docker-offline docker-dry docker-preview docker-down

docker-fetch:
	@docker compose run --rm fetch

docker-offline:
	@docker compose run --rm -e OFFLINE_MODE=true fetch

docker-dry:
	@docker compose run --rm -e DRY_RUN=true fetch

docker-preview:
	@docker compose up preview

docker-down:
	@docker compose down

