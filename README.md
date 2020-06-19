# hocdoc-crawler-github

A Typescript library to fetch data from GitHub projects and write them to JSON files for the HocDoc parser.

The crawler fetches all data of these types:

- Issues
- Pull Requests
- Releases
- Milestones

After the first call, only the new data is fetched in the next calls.

Unfortunately it needs an API key, even if you just crawl public GitHub repositories.

[Create a Personal access token](https://github.com/settings/tokens) - no additional permissions are needed for public repositories

It uses the GitHub Graphql API V. 4.

This project was bootstrapped with [TSDX](https://github.com/jaredpalmer/tsdx).

## CLI usage

Usage: `node dist/index.js crawl <url> <accessToken>`

CLI usage is just there for testing, the main purpose is usage as a library.

```
node dist/index.js crawl https://github.com/mui-org/material-ui-pickers "token 8284420bsfffs4c36579adcef8657bb96157db"
```
