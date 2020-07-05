/**
 * @packageDocumentation
 * @module run-z
 */
import { ZTask } from '../tasks';
import type { ZPackageLocation } from './package-location';
import type { ZPackageResolver } from './package-resolver';
import type { ZPackageSet } from './package-set';
import type { ZPackageJson } from './package.json';

/**
 * NPM package containing tasks and rules.
 */
export class ZPackage implements ZPackageSet {

  /**
   * Tasks hosted by this package.
   */
  readonly tasks: ReadonlyMap<string, ZTask>;

  private _scopeName: string | null | undefined = null;
  private _unscopedName?: string;
  private _hostPackage?: ZPackage;
  private _subPackageName: string | null | undefined = null;
  private _aliases?: readonly [string, ...string[]];

  /**
   * Constructs a package.
   *
   * @param resolver  Package resolver.
   * @param location  Package location.
   * @param packageJson  `package.json` contents.
   * @param parent  Parent NPM package.
   */
  constructor(
      readonly resolver: ZPackageResolver,
      readonly location: ZPackageLocation,
      readonly packageJson: ZPackageJson,
      readonly parent?: ZPackage,
  ) {

    const { scripts = {} } = packageJson;
    const tasks = new Map<string, ZTask>();

    for (const [key, value] of Object.entries(scripts)) {

      const spec = this.resolver.taskParser.parse(value);

      tasks.set(key, new ZTask(this, key, spec));
    }

    this.tasks = tasks;
  }

  /**
   * An iterable consisting of this package.
   */
  get packages(): Iterable<this> {
    return [this];
  }

  /**
   * Full package name.
   */
  get name(): string {
    return this.aliases[0];
  }

  /**
   * Package scope name including leading `@` for scoped packages, or `undefined` for unscoped ones.
   */
  get scopeName(): string | undefined {
    if (this._scopeName !== null) {
      return this._scopeName;
    }

    const { name } = this;

    if (name.startsWith('@')) {

      const slashIdx = name.indexOf('/');

      if (slashIdx >= 0) {
        return this._scopeName = name.substr(0, slashIdx);
      }
    }

    return this._scopeName = undefined;
  }

  /**
   * Unscoped package name for scoped packages, or full package names for unscoped ones.
   */
  get unscopedName(): string {
    if (this._unscopedName != null) {
      return this._unscopedName;
    }

    const { scopeName, name } = this;

    return this._unscopedName = scopeName == null
        ? name
        : name.substr(scopeName.length + 1);
  }

  /**
   * Host package for sub-packages, or this package for top-level ones.
   */
  get hostPackage(): ZPackage {
    if (this._hostPackage) {
      return this._hostPackage;
    }
    return this._hostPackage = this.subPackageName == null
        ? this
        : this.parent!.hostPackage;
  }

  /**
   * Sub-package name for nested packages, or `undefined` for top-level ones.
   */
  get subPackageName(): string | undefined {
    if (this._subPackageName !== null) {
      return this._subPackageName;
    }

    const { unscopedName } = this;
    const slashIdx = unscopedName.indexOf('/');

    return this._subPackageName = slashIdx < 0
        ? undefined
        : unscopedName.substr(slashIdx + 1);
  }

  /**
   * Available package aliases.
   *
   * The first alias is always a {@link name full package name}.
   */
  get aliases(): readonly [string, ...string[]] {
    if (this._aliases) {
      return this._aliases;
    }

    const packageName = this.packageJson.name;
    const aliases = new Set<string>();

    if (packageName) {
      addPackageAliases(packageName, aliases);
    } else if (this.parent) {

      const dirName = this.location.path.substr(this.parent.location.path.length);

      addPackageAliases(`${this.parent.name}${dirName}`, aliases);
    } else {
      aliases.add(this.location.baseName);
    }

    return this._aliases = Array.from(aliases) as [string, ...string[]];
  }

}

/**
 * @internal
 */
function addPackageAliases(name: string, aliases: Set<string>): void {
  aliases.add(name);
  if (name.startsWith('@')) {

    const slashIdx = name.indexOf('/');

    if (slashIdx > 0) {
      aliases.add(name.substr(slashIdx + 1));
    }
  }
}
