/**
 * @packageDocumentation
 * @module run-z
 */
import { parse } from 'shell-quote';
import { InvalidZTaskError } from './invalid-task-error';

/**
 * Task specifier.
 */
export interface ZTaskSpec {

  /**
   * Whether this is a native task.
   *
   * `true` when this is no a `run-z` command
   */
  readonly isNative: boolean;

  /**
   * Task dependencies.
   *
   * I.e. other tasks to run before this one.
   */
  readonly deps: readonly ZTaskSpec.TaskRef[];

  /**
   * Command line arguments to the script this task executes.
   */
  readonly args: readonly string[];

}

export namespace ZTaskSpec {

  /**
   * Task reference.
   */
  export interface TaskRef {

    /**
     * Task name.
     */
    readonly task: string;

    /**
     * Whether this task can be executed in parallel with preceding one.
     */
    readonly parallel: boolean;

    /**
     * Command line arguments.
     */
    readonly args: readonly string[];

  }

}

/**
 * @internal
 */
const nativeZTask: ZTaskSpec = {
  isNative: true,
  deps: [],
  args: [],
};

/**
 * @internal
 */
const zTaskArgsSep = /\.\.\./;

export const ZTaskSpec = {

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
    const deps: ZTaskSpec.TaskRef[] = [];
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
        deps.push({ task: depTask, parallel: depParallel, args: depArgs });
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

      const parts = entry.split(zTaskArgsSep);

      for (let p = 0; p < parts.length; ++p) {

        const part = parts[p];

        if (part) {
          if (inDepArgs) {
            depArgs.push(part);
          } else {

            const tasks = part.split(',');

            for (let t = 0; t < tasks.length; ++t) {
              appendTask();
              entryIndex = e;

              const task = tasks[t];

              if (task) {
                depTask = task;
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
      args: entries.slice(e),
    };
  },

};

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