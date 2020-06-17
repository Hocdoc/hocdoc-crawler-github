import { Repository, writeProjectData } from '../src';
import { promises as fs } from 'fs';
import { homedir} from 'os';

describe('fetchIssues', () => {
  it(
    'works',
    async done => {
      //const repository: Repository = {owner: "Hocdoc", name: "hocdoc-crawler-github"};
      //const repository: Repository = {owner: "Hocdoc", name: "carrotElasticsearch15"};
      const repository: Repository = {
        owner: 'mui-org',
        name: 'material-ui-pickers',
      };
      const accessToken = (await fs.readFile(homedir + "/githubToken.txt", "utf8")).trim();
      await writeProjectData(repository, accessToken);
      done();
      // expect(sum(1, 1)).toEqual(2);
    },
    3600 * 1000
  );
});
