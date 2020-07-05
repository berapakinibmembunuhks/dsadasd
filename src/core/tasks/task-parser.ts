/**
 * @packageDocumentation
 * @module run-z
 */
import { parse } from 'shell-quote';
import { InvalidZTaskError } from './invalid-task-error';
import type { ZTaskSpec } from './task-spec';

/**
 * @internal
 */
const nativeZTask: ZTaskSpec = {
  isNative: true,
  deps: [],
  attrs: {},
  args: [],
};

/**
 * @internal
 */
const zTaskArgsSep = /\/\//;

/**
 * A parser of {@link ZTaskSpec task specifier} by command line.
 */
export class ZTaskParser {

  /**
   * Checks whether the given name is relative package path.
   *
   * @param name  The name to check.
   *
   * @returns `true` is the given `name` is either `.` or `..`, or starts with either `./` or `.//`. `false` otherwise.
   */
  isPackagePath(name: string): boolean {
    return name === '.' || name === '..' || name.startsWith('./') || name.startsWith('../');
  }

  /**
   * Builds task specifier by its command line.
   *
   * @param commandLine  Task command line.
   *
   * @returns Parsed task specifier.
   */
  parse(commandLine: string): ZTaskSpec {

    const entries = parseZTaskEntries(commandLine);

    if (!entries) {
      return nativeZTask;
    }

    let e = 0;
    let entryIndex = 0;
    let entryPosition = 0;
    const deps: ZTaskSpec.Dep[] = [];
    const attrs: Record<string, string[]> = {};
    let depTask: string | undefined;
    let depParallel = false;
    let depArgs: string[] = [];
    let inDepArgs = false;

    const parseError = (message: string): never => {

      let position = 0;
      let reconstructedCmd = '';

      for (let i = 0; i < entries.length; ++i) {

        const entry = entries[i];

        if (i === entryIndex) {
          position = reconstructedCmd.length + entryPosition;
          if (entryPosition >= entry.length) {
            // The end of entry
            // Move to the start of the next one.
            ++position;
          }
        }
        if (reconstructedCmd) {
          reconstructedCmd += ' ';
        }

        reconstructedCmd += entry;
      }

      throw new InvalidZTaskError(message, reconstructedCmd, position);
    };
    const appendTask = (): void => {
      if (depTask) {
        // Finish the task.
        deps.push(createZTaskRef(depTask, depParallel, depArgs));
        depArgs = [];
        depParallel = false;
        depTask = undefined;
      } else if (depArgs.length) {
        parseError('Task arguments specified, but not the task');
      }
    };

    for (; e < entries.length; ++e) {

      const entry = entries[e];

      if (entry.startsWith('-')) {
        break;
      }
      if (this.isPackagePath(entry)) {
        // Package reference
        appendTask();
        entryIndex = e + 1;
        deps.push({ host: entry });
        continue;
      }
      const eqIdx = entry.indexOf('=');

      if (eqIdx >= 0) {

        const slashIdx = entry.indexOf('/');

        if (slashIdx < 0 || eqIdx < slashIdx) {
          // Attribute specifier.
          appendTask();
          entryIndex = e + 1;
          addZTaskAttr(attrs, entry, eqIdx);
          continue;
        }
      }

      const parts = entry.split(zTaskArgsSep);

      for (let p = 0; p < parts.length; ++p) {

        const part = parts[p];

        if (part) {
          if (inDepArgs) {
            depArgs.push(part);
          } else {

            const tasks = part.split(',');

            for (let t = 0; t < tasks.length; ++t) {

              const [task, ...rest] = tasks[t].split('/');
              const args = rest.filter(arg => !!arg);

              if (!task) {
                // Just arg(s)
                if (args.length && t) {
                  ++entryPosition; // Comma
                  parseError('Task argument specified, but not the task');
                }
                depArgs.push(...args);
                if (tasks.length === 1) {
                  continue;
                }
              }

              appendTask();
              entryIndex = e;

              if (task) {
                depTask = task;
                depArgs = args;
              }

              if (t) {
                depParallel = true;
                ++entryPosition; // Comma
              }
              entryPosition += task.length;
            }
          }
        }

        if (p + 1 < parts.length) {
          inDepArgs = !inDepArgs;
        }
      }
    }

    appendTask();
    return {
      isNative: false,
      deps,
      attrs,
      args: entries.slice(e),
    };
  }

}

/**
 * @internal
 */
function parseZTaskEntries(commandLine: string): string[] | undefined {

  let withEnv = false;
  const detectEnv = (): undefined => {
    withEnv = true;
    return;
  };
  const entries = parse(commandLine, detectEnv);

  if (entries[0] !== 'run-z') {
    return; // Not a run-z script.
  }
  if (withEnv) {
    return; // Environment variable substitution supported in native scripts only.
  }
  if (entries.every(entry => typeof entry === 'string')) {
    return entries.slice(1) as string[];
  }

  return; // Special shell command present.
}

/**
 * @internal
 */
function createZTaskRef(task: string, parallel: boolean, allArgs: string[]): ZTaskSpec.TaskRef {

  const attrs: Record<string, string[]> = {};
  const args: string[] = [];

  for (const arg of allArgs) {
    if (!arg.startsWith('-')) {

      const eqIdx = arg.indexOf('=');

      if (eqIdx >= 0) {
        addZTaskAttr(attrs, arg, eqIdx);
        continue;
      }
    }

    args.push(arg);
  }

  return {
    task,
    parallel,
    attrs,
    args,
  };
}

/**
 * @internal
 */
function addZTaskAttr(attrs: Record<string, string[]>, arg: string, eqIdx: number): void {

  let name: string;
  let value: string;

  if (eqIdx) {
    name = arg.substr(0, eqIdx);
    value = arg.substr(eqIdx + 1);
  } else {
    name = arg.substr(1);
    value = '';
  }

  if (attrs[name]) {
    attrs[name].push(value);
  } else {
    attrs[name] = [value];
  }
}