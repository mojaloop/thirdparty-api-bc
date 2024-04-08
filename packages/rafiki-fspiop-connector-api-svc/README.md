# ThirdParty API BC - Rafiki FSPIOP Connector API Service


Mojaloop vNext ThirdParty API BC Rafiki FSPIOP Connector API Service

#Notes

### Install
See notes in root dir of this repository

More information on how to install NVM: https://github.com/nvm-sh/nvm

## Build

```bash
npm run build
```

## Run this service

Anywhere in the repo structure:
```bash
npm run modules/example-svc start
```

## Auto build (watch)

```bash
npm run watch
```

## Unit Tests

```bash
npm run test:unit
```

## Integration Tests

```bash
npm run test:integration
```

## Configuration 

### Environment variables

| Environment Variable | Description    | Example Values         |
|---------------------|-----------------|-----------------------------------------|
| LOG_LEVEL            | Logging level for the application                  | LogLevel.DEBUG        |
| PRODUCTION_MODE      | Flag indicating production mode   | FALSE                  |
| KAFKA_URL       | Kafka broker URL     | localhost:9092          |
| KAFKA_LOGS_TOPIC      | Kafka topic for logs          | logs    |
| KAFKA_AUDITS_TOPIC        | Kafka topic for audits              | audits                 |
| AUDIT_KEY_FILE_PATH  | File path for audit key           | /app/data/audit_private_key.pem       |
| FSIOP_URL     | FSPIOP Service URL | http://fspiop.local | 