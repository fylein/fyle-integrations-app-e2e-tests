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

The test creates a new Fyle account via the signup API. If signup is not available (404 or 403), **tests are skipped and the run still passes**.

To run tests against a real account instead:

- Ensure `.env` has valid `API_DOMAIN` and `INTERNAL_SIGNUP_TOKEN` (from the team), or
- Set `LOCAL_DEV_EMAIL` in `.env` to an existing Fyle user email; the test will skip signup and use that account (password must be `Password@1234`). `LOCAL_DEV_PASSWORD` is not used; the test account password is fixed.

### CI (GitHub Actions)

Tests run **without** requiring `LOCAL_DEV_EMAIL` or `LOCAL_DEV_PASSWORD`. If account creation (signup) fails (e.g. 404 or 403), tests are skipped and the run still **passes** (exit code 0).

Required secrets in **Settings → Environments → Fyle Staging** are listed in the workflow. Optional:

- **Use an existing account:** Add `LOCAL_DEV_EMAIL` with a staging user email to skip signup and run tests against that account (password must be `Password@1234`).
- **Different signup URL:** Add `API_SIGNUP_URL` with the full signup URL if it differs from the default.
- Check the "Run Playwright tests" log for `Signup URL: ...` to see which URL is used.

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
