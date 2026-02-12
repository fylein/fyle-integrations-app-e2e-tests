# fyle-integrations-app-e2e-tests

End to end tests for the Fyle Integrations App

## Installation

### Install nvm

If not already present, install nvm on your mac following the instructions [here](https://sukiphan.medium.com/how-to-install-nvm-node-version-manager-on-macos-d9fe432cc7db)

### Install node version 22

```
nvm install 22
nvm use 22
```

### Install node modules

```
npm install
npx playwright install
```

### Setup a .env file

Create a .env file in the root folder of the repo, and ping @Viswas for its contents.

## Running tests


### Running inside VS Code / Cursor (recommended)

You absolutely should run Playwright using the VS Code extension. It will make your life 10x easier.

Follow the steps in this [article](https://playwright.dev/docs/getting-started-vscode)


### Running in your terminal

Switch to using node v22 in the terminal.

```
nvm use 22
node --version # confirm that it is version 22
```

Do this if you want to see what the test does visually

```
npx playwright test --headed
```

If you want to see detailed traces while test is executing visually

```
npx playwright test --ui
```

If you want to run tests in headless mode

```
npx playwright test
```

This is boring - you dont see magical stuff happening. This would be useful in a CI/CD situation

### If account creation fails (404 / 403)

The test creates a new Fyle account via the signup API. If signup is not available (404 or 403), the run will fail. Ensure `API_DOMAIN` and `INTERNAL_SIGNUP_TOKEN` are correct for your environment so signup succeeds.

For local dev only, you can set `LOCAL_DEV_EMAIL` in `.env` to an existing Fyle user email to skip signup (password must be `Password@1234`). CI does not use `LOCAL_DEV_EMAIL`; it uses signup.

### CI (GitHub Actions)

Tests run using **signup** (no `LOCAL_DEV_EMAIL`). Required secrets in **Settings → Environments → Fyle Staging**:

- `API_DOMAIN`, `APP_DOMAIN`, `INTERNAL_SIGNUP_TOKEN`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, plus Intacct secrets as needed.

Signup is tried at `API_DOMAIN/api/auth/basic/signup` and, on 404, at `API_DOMAIN/platform/v1/auth/signup`. Ensure staging exposes a working signup endpoint and `INTERNAL_SIGNUP_TOKEN` is valid.

## Best practices

- Read Playwright [best practices](https://playwright.dev/docs/best-practices) doc
- Test independence
  - Ideally, each test case should be independent
  - However, setup can be expensive
  - Group tests in groups and make each test group independent
  - Setup an org from scratch for every test group
- When “locating” elements, use only visual cues
  - If you tweak DOM structure, test shouldn’t fail
- Use Page Object Model *sparingly*
  - With POM, you can’t generate code from recording slowing down test writing
  - Only if you have a solid reason, such as a particular block of code being reused across tests/files, should you consider POM
  - POM files are located in the `common/pom/` folder
- Don’t use sleep
