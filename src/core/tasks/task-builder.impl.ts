import { ZBatcher } from '../batchers';
import type { ZPackage } from '../packages';
import type { AbstractZTask } from './impl';
import { CommandZTask, GroupZTask, ScriptZTask, UnknownZTask } from './impl';
import type { ZTaskBuilder } from './task-builder';
import type { ZTaskSpec } from './task-spec';
import { addZTaskAttr, addZTaskAttrs } from './task-spec.impl';

/**
 * @internal
 */
export class ZTaskBuilder$<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> implements ZTaskBuilder<TAction> {

  _batcher: ZBatcher = ZBatcher.batchTask;
  private readonly _pre: ZTaskSpec.Pre[] = [];
  private readonly _attrs: Record<string, [string, ...string[]]> = {};
  private readonly _args: string[] = [];
  private _action?: ZTaskSpec.Action;

  constructor(readonly target: ZPackage, readonly name: string) {
  }

  get action(): TAction | undefined {
    return this._action as TAction;
  }

  addPre(pre: ZTaskSpec.Pre): this {
    this._pre.push(pre);
    return this;
  }

  addAttr(name: string, value: string): this {
    addZTaskAttr(this._attrs, name, value);
    return this;
  }

  addAttrs(attrs: ZTaskSpec.Attrs): this {
    addZTaskAttrs(this._attrs, attrs);
    return this;
  }

  addArg(...args: string[]): this {
    this._args.push(...args);
    return this;
  }

  setBatcher(batcher: ZBatcher): this {
    this._batcher = batcher;
    return this;
  }

  setAction<TNewAction extends ZTaskSpec.Action>(action: TNewAction): ZTaskBuilder$<TNewAction> {
    this._action = action;
    return this as ZTaskBuilder$<any>;
  }

  async parse(commandLine: string): Promise<this> {
    await this.target.setup.taskParser.parse(this, commandLine);
    return this;
  }

  async applyOptions(args: readonly string[], fromIndex?: number): Promise<this> {
    await this.target.setup.taskParser.applyOptions(this, args, fromIndex);
    return this;
  }

  async applyArgv(
      taskName: string | undefined,
      argv: readonly string[],
      fromIndex = 2,
  ): Promise<this> {
    if (!taskName) {
      // Task name is unknown
      return this.applyOptions(argv, fromIndex);
    }

    const script = this.target.packageJson.scripts?.[taskName];

    if (!script) {
      // No such script
      return this.applyOptions(argv, fromIndex);
    }

    const args = this.target.setup.taskParser.parseCommandLine(script);

    // Consider the first script argument is either `run-z` or something acceptable
    if (!args || args.length - 1 > argv.length - fromIndex) {
      return this.applyOptions(argv, fromIndex);
    }

    // Ensure the script is a prefix of the process command line
    for (let i = 1; i < args.length; ++i) {
      if (args[i] !== argv[i - 1 + fromIndex]) {
        // Script is not a prefix of process command line
        return this.applyOptions(argv, fromIndex);
      }
    }

    // Apply script options first
    await this.applyOptions(args, 1);

    // Then apply explicit options
    return this.applyOptions(argv, args.length - 1 + fromIndex);
  }

  spec(): ZTaskSpec<TAction> {
    return {
      pre: this._pre,
      attrs: this._attrs,
      args: this._args,
      action: this._action || { type: 'group', targets: [] },
    } as ZTaskSpec<any>;
  }

  task(): AbstractZTask<TAction> {

    const spec: ZTaskSpec<any> = this.spec();

    switch (spec.action.type) {
    case 'command':
      return new CommandZTask(this, spec) as AbstractZTask<any>;
    case 'group':
      return new GroupZTask(this, spec) as AbstractZTask<any>;
    case 'script':
      return new ScriptZTask(this, spec) as AbstractZTask<any>;
    case 'unknown':
    default:
      return new UnknownZTask(this, spec) as AbstractZTask<any>;
    }
  }

}

