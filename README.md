# hocdoc-crawler-github

A Typescript library to fetch data from GitHub projects and write them to JSON files for the HocDoc parser.

The crawler fetches all data of these types:

* Issues
* Pull Requests

After the first call, only the new data is fetched in the next calls.
Unfortunately it needs an API key, even if you just crawl public GitHub repositories.

It uses the GitHub Graphql API V. 4.

This project was bootstrapped with [TSDX](https://github.com/jaredpalmer/tsdx).
