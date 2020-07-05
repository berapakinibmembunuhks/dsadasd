import { ZPackage } from './package';
import { ZPackageResolver } from './package-resolver';
import { ZPackageTree } from './package-tree';

describe('ZPackage', () => {

  let pkg: ZPackage;

  beforeEach(async () => {

    const tree = new ZPackageTree(
        'test',
        {
          scripts: {
            task1: 'run-z --then exec1',
            task2: 'run-z task1 --then exec2',
          },
        },
    );

    pkg = new ZPackage(new ZPackageResolver(tree), tree, await tree.load());
  });

  describe('tasks', () => {
    it('contains tasks', () => {
      expect(pkg.tasks.size).toBe(2);
      expect(pkg.tasks.get('task1')?.name).toBe('task1');
      expect(pkg.tasks.get('task2')?.name).toBe('task2');
    });
  });
});
