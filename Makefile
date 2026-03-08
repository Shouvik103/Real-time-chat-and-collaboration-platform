.PHONY: up down logs ps clean

up:
	docker-compose up --build

down:
	docker-compose down

logs:
	docker-compose logs -f

ps:
	docker-compose ps

clean:
	docker-compose down -v --remove-orphans
