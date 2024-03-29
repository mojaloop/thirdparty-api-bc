# Mojaloop vNext Third-Party API BC

**EXPERIMENTAL** vNext Typescript Bounded Context Mono Repository for Third-Party APIs and connectors Context

The Third Party API BC has been implemented with the Mojaloop 2.0 Reference Architecture to enable third-party PISP Operators (typically applications) to interact with the platform.

See the Reference Architecture documentation [Thirdparty API](https://mojaloop.github.io/reference-architecture-doc/boundedContexts/thirdPartyApi/) for context on this vNext implementation guidelines.  

## Contents
- [thirdparty-api-bc](#mojaloop-vnext-third-party-api-bc)
  - [Contents](#contents)
  - [Packages](#packages)
  - [Configuration](#configuration)
  - [Tests](#tests)
  - [Auditing Dependencies](#auditing-dependencies)
  - [CI/CD](#cicd-pipelines)
  - [Documentation](#documentation)

## Packages
The Accounts and Balances BC consists of the following packages;

`rafiki-fspiop-connector-api-svc`
Rafiki and FSPIOP connector API Service.
[README](./packages/rafiki-fspiop-connector-api-svc/README.md)


## Configuration

See the README.md file on each services for more Environment Variable Configuration options.

## Tests

### Unit Tests

```bash
npm run test:unit
```

### Run Integration Tests

```shell
npm run test:integration
```

### Run all tests at once
Requires integration tests pre-requisites
```shell
npm run test
```

# Collect coverage (from both unit and integration test types)

After running the unit and/or integration tests: 

```shell
npm run posttest
```

You can then consult the html report in:

```shell
coverage/lcov-report/index.html
```

## Auditing Dependencies
We use npm audit to check dependencies for node vulnerabilities. 

To start a new resolution process, run:
```
npm run audit:fix
``` 

You can check to see if the CI will pass based on the current dependencies with:

```
npm run audit:check
```

## CI/CD Pipelines

### Execute locally the pre-commit checks - these will be executed with every commit and in the default CI/CD pipeline 

Make sure these pass before committing any code
```
npm run pre_commit_check
```

### Work Flow 

 As part of our CI/CD process, we use CircleCI. The CircleCI workflow automates the process of publishing changed packages to the npm registry and building Docker images for select packages before publishing them to DockerHub. It also handles versioning, tagging commits, and pushing changes back to the repository.

The process includes five phases. 
1. Setup : This phase initializes the environment, loads common functions, and retrieves commits and git change history since the last successful CI build.

2. Detecting Changed Package.

3. Publishing Changed Packages to NPM.

4. Building Docker Images and Publishing to DockerHub.

5. Pushing Commits to Git.

 All code is automatically linted, built, and unit tested by CircleCI pipelines, where unit test results are kept for all runs. All libraries are automatically published to npm.js, and all Docker images are published to Docker Hub.

 ## Documentation
The following documentation provides insight into the FSP Interoperability API Bounded Context.

- **Reference Architecture** - https://mojaloop.github.io/reference-architecture-doc/boundedContexts/thirdPartyApi/
- **MIRO Board** - https://miro.com/app/board/o9J_lJyA1TA=/
- **Work Sessions** - https://docs.google.com/document/d/1Nm6B_tSR1mOM0LEzxZ9uQnGwXkruBeYB2slgYK1Kflo/edit#heading=h.6w64vxvw6er4
