# GitHub Workflows

This directory contains GitHub Actions workflows for the Bitcoin Map project.

## Workflows

### `test.yml`

This workflow runs tests for both the backend and frontend on each push to the main branch and on each pull request.

**What it does:**
- Runs backend tests using Node.js 18.x
- Generates a coverage report for the backend
- Uploads the coverage report as an artifact
- Runs frontend tests using Node.js 18.x
- Generates a coverage report for the frontend
- Uploads the coverage report as an artifact

### `coverage.yml`

This workflow checks the code coverage on each pull request and comments on the PR with the coverage report.

**What it does:**
- Generates a coverage report for the backend
- Checks if the coverage is below the threshold (75%)
- Comments on the PR with the coverage report
- Highlights files with low coverage

## Adding New Workflows

When adding new workflows:

1. Create a new YAML file in the `.github/workflows` directory
2. Follow the GitHub Actions syntax
3. Test the workflow by creating a PR
4. Update this README with information about the new workflow 