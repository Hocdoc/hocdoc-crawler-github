#!/usr/bin/env node

import {
  crawlProjectData,
  crawlProjectDataFromUrl,
  ownerNameFromUrl,
  CrawlResult,
  OwnerName,
} from './crawlProjectData';
import yargs from 'yargs';
import { START_DATE } from './utils';
import cliProgress from 'cli-progress';

const multibar = new cliProgress.MultiBar(
  {
    clearOnComplete: true,
    stopOnComplete: true,
    hideCursor: true,
    format:
      '[{bar}] {percentage}% | {value}/{total} | {category} | {task} | {location}',
  },
  cliProgress.Presets.shades_grey
);

yargs
  .usage('Usage: $0 <command> [options]')
  .command(
    'crawl <url> <accessToken>',
    'Crawl the data from an GitHub project',
    {},
    argv => {
      crawlProjectDataFromUrl(
        argv.url as string,
        START_DATE,
        argv.accessToken as string,
        multibar
      );
      multibar.stop();
    }
  )
  .example(
    'crawl',
    '"https://github.com/mui-org/material-ui-pickers" "token 8284PersonalTokenFromGitHubf8657bb96157db"'
  )
  .parse();

export {
  crawlProjectData,
  crawlProjectDataFromUrl,
  ownerNameFromUrl,
  CrawlResult,
  OwnerName,
};
