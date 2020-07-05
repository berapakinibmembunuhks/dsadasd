import * as path from 'path';
import { pathToFileURL, URL } from 'url';
import { ZPackageDirectory } from '../../fs';
import { ZTaskParser } from '../tasks';
import type { ZPackage } from './package';
import { ZPackageResolver } from './package-resolver';

describe('ZPackageResolver', () => {

  let rootURL: URL;
  let resolver: ZPackageResolver;

  beforeEach(() => {
    rootURL = pathToFileURL(path.join(process.cwd(), 'src', 'core', 'packages', 'spec'));
  });

  function packageLocation(path: string): ZPackageDirectory {
    return ZPackageDirectory.create(new URL(path, rootURL.href + '/'), rootURL);
  }

  function newResolver(path: string): ZPackageResolver {
    return new ZPackageResolver(packageLocation(path), { taskParser: new ZTaskParser() });
  }

  describe('anonymous package', () => {

    let pkg: ZPackage;

    beforeEach(async () => {
      resolver = newResolver('anonymous');
      pkg = await resolver.get(packageLocation('anonymous'));
    });

    it('is resolved', () => {
      expect(pkg.name).toBe('anonymous');
    });

    describe('parent', () => {
      it('is absent', () => {
        expect(pkg.parent).toBeUndefined();
      });
    });

    describe('scopeName', () => {
      it('is absent', () => {
        expect(pkg.scopeName).toBeUndefined();
        expect(pkg.scopeName).toBeUndefined();
      });
    });

    describe('unscopedName', () => {
      it('is the same as name', () => {
        expect(pkg.unscopedName).toBe(pkg.name);
        expect(pkg.unscopedName).toBe(pkg.name);
      });
    });

    describe('hostPackage', () => {
      it('is the package itself', () => {
        expect(pkg.hostPackage).toBe(pkg);
        expect(pkg.hostPackage).toBe(pkg);
      });
    });

    describe('subPackageName', () => {
      it('is absent', () => {
        expect(pkg.subPackageName).toBeUndefined();
        expect(pkg.subPackageName).toBeUndefined();
      });
    });
  });

  describe('nested', () => {

    let nested: ZPackage;
    let deeplyNested: ZPackage;

    beforeEach(async () => {
      resolver = newResolver('nesting/nested/deeply-nested');
      nested = await resolver.get(packageLocation('nesting/nested'));
      deeplyNested = await resolver.get(packageLocation('nesting/nested/deeply-nested'));
    });

    it('is resolved', () => {
      expect(nested.name).toBe('named-nested');
      expect(deeplyNested.name).toBe('named-nested/deeply-nested');
    });

    describe('parent', () => {
      it('is present', () => {
        expect(nested.parent?.name).toBe('host-package');
        expect(deeplyNested.parent).toBe(nested);
      });
    });

    describe('scopeName', () => {
      it('is absent', () => {
        expect(nested.scopeName).toBeUndefined();
        expect(deeplyNested.scopeName).toBeUndefined();
      });
    });

    describe('unscopedName', () => {
      it('is the same as name', () => {
        expect(nested.unscopedName).toBe(nested.name);
        expect(deeplyNested.unscopedName).toBe(deeplyNested.name);
      });
    });

    describe('hostPackage', () => {
      it('is the package itself when explicitly names', () => {
        expect(nested.hostPackage).toBe(nested);
        expect(nested.hostPackage).toBe(nested);
      });
      it('is the closest named package when anonymous', () => {
        expect(deeplyNested.hostPackage).toBe(nested);
        expect(deeplyNested.hostPackage).toBe(nested);
      });
    });

    describe('subPackageName', () => {
      it('is absent when explicitly named', () => {
        expect(nested.subPackageName).toBeUndefined();
      });
      it('is a directory name when anonymous', () => {
        expect(deeplyNested.subPackageName).toBe('deeply-nested');
        expect(deeplyNested.subPackageName).toBe('deeply-nested');
      });
    });
  });

  describe('scoped', () => {

    let pkg: ZPackage;
    let nested: ZPackage;
    let deeplyNested: ZPackage;

    beforeEach(async () => {
      resolver = newResolver('scoped/nested/deeper');
      pkg = await resolver.get(packageLocation('scoped'));
      nested = await resolver.get(packageLocation('scoped/nested'));
      deeplyNested = await resolver.get(packageLocation('scoped/nested/deeper'));
    });

    it('is resolved', () => {
      expect(pkg.name).toBe('@scope-name/package-name');
      expect(nested.name).toBe('@scope-name/package-name/nested');
      expect(deeplyNested.name).toBe('@scope-name/package-name/nested/deeper');
    });

    describe('parent', () => {
      it('is present', () => {
        expect(pkg.parent).toBeUndefined();
        expect(nested.parent).toBe(pkg);
        expect(deeplyNested.parent).toBe(nested);
      });
    });

    describe('scopeName', () => {
      it('is present', () => {
        expect(pkg.scopeName).toBe('@scope-name');
        expect(nested.scopeName).toBe('@scope-name');
        expect(deeplyNested.scopeName).toBe('@scope-name');
      });
    });

    describe('unscopedName', () => {
      it('is the name without scope', () => {
        expect(pkg.unscopedName).toBe('package-name');
        expect(nested.unscopedName).toBe('package-name/nested');
        expect(deeplyNested.unscopedName).toBe('package-name/nested/deeper');
      });
    });

    describe('hostPackage', () => {
      it('is the topmost named package', () => {
        expect(pkg.hostPackage).toBe(pkg);
        expect(nested.hostPackage).toBe(pkg);
        expect(deeplyNested.hostPackage).toBe(pkg);
      });
    });

    describe('subPackageName', () => {
      it('is a directory', () => {
        expect(pkg.subPackageName).toBeUndefined();
        expect(nested.subPackageName).toBe('nested');
        expect(deeplyNested.subPackageName).toBe('nested/deeper');
      });
    });
  });

  describe('illegally scoped', () => {

    let pkg: ZPackage;

    beforeEach(async () => {
      resolver = newResolver('illegally-scoped');
      pkg = await resolver.get(packageLocation('illegally-scoped'));
    });

    it('is resolved', () => {
      expect(pkg.name).toBe('@not-scope');
    });

    describe('scopeName', () => {
      it('is absent', () => {
        expect(pkg.scopeName).toBeUndefined();
        expect(pkg.scopeName).toBeUndefined();
      });
    });

    describe('unscopedName', () => {
      it('is the same as name', () => {
        expect(pkg.unscopedName).toBe(pkg.name);
        expect(pkg.unscopedName).toBe(pkg.name);
      });
    });
  });
});
