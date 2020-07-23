import { overNone, thruIt } from '@proc7ts/a-iterable';
import { nextSkip } from '@proc7ts/call-thru';
import type { ZSetup } from '../setup';
import type { ZTask, ZTaskQualifier, ZTaskSpec } from '../tasks';
import { UnknownZTaskError } from '../tasks';
import type { ZCall } from './call';
import type { ZCallInstruction } from './call-instruction';
import { ZCallRecord } from './call.impl';
import { ZExecutor } from './job.impl';
import type { ZPlan } from './plan';

/**
 * @internal
 */
export class ZInstructionRecords {

  rev = 0;
  readonly plan: ZPlan;
  readonly executor: ZExecutor = new ZExecutor();
  private readonly _qualifiers = new Map<ZTask, Set<ZTaskQualifier>>();
  private readonly _calls = new Map<ZTask, ZCallRecord>();
  private readonly _prerequisites = new Map<ZTask, Set<ZTask>>();
  private readonly _parallel = new Map<ZTaskQualifier, Set<ZTaskQualifier>>();

  constructor(readonly setup: ZSetup) {
    this.plan = {
      calls: () => this._calls.values(),
      callOf: <TAction extends ZTaskSpec.Action>(task: ZTask<TAction>): ZCall<TAction> => {

        const call = this._calls.get(task) as ZCallRecord<TAction> | undefined;

        if (!call) {
          throw new UnknownZTaskError(
              task.target.name,
              task.name,
              `Task "${task.name}" from <${task.target.name}> is never called`,
          );
        }

        return call;
      },
    };
  }

  qualify(task: ZTask, qualifier: ZTaskQualifier): Set<ZTaskQualifier> {

    let qualifiers = this._qualifiers.get(task);

    if (qualifiers) {
      qualifiers.add(qualifier);
    } else {
      qualifiers = new Set<ZTaskQualifier>().add(task).add(qualifier);
      this._qualifiers.set(task, qualifiers);
    }

    return qualifiers;
  }

  private _qualifiersOf(task: ZTask): Iterable<ZTaskQualifier> {
    return this._qualifiers.get(task) || [task];
  }

  async call<TAction extends ZTaskSpec.Action>(
      instruction: ZCallInstruction<TAction>,
      by?: ZCallRecord,
  ): Promise<ZCall<TAction>> {
    ++this.rev;

    const { task } = instruction;
    let call = this._calls.get(task) as ZCallRecord<TAction> | undefined;

    if (call) {
      call._call(instruction, by!); // `by` always known here
    } else {
      call = new ZCallRecord(this, by, instruction);
      this._calls.set(task, call);
      await call._plan(task);
    }
    await call._plan(instruction);

    return call;
  }

  order(first: ZTask, second: ZTask): void {
    const prerequisites = this._prerequisites.get(second);

    if (prerequisites) {
      prerequisites.add(first);
    } else {
      this._prerequisites.set(second, new Set<ZTask>().add(first));
    }
  }

  prerequisitesOf(dependent: ZTask): Iterable<ZCall> {

    const prerequisites = this._prerequisites.get(dependent);

    if (!prerequisites) {
      return overNone();
    }

    return thruIt(
        prerequisites,
        task => this._calls.get(task) || nextSkip,
    );
  }

  isPrerequisiteOf(target: ZTask, toCheck: ZTask, checked: Set<ZTask>): boolean {
    if (checked.has(target)) {
      return false;
    }
    checked.add(target);

    const prerequisites = this._prerequisites.get(target);

    if (!prerequisites) {
      return false;
    }
    if (prerequisites.has(toCheck)) {
      return true;
    }
    for (const prerequisite of prerequisites) {
      if (this.isPrerequisiteOf(prerequisite, toCheck, checked)) {
        return true;
      }
    }

    return false;
  }

  makeParallel(tasks: ZTaskQualifier[]): void {
    for (let i = tasks.length - 1; i > 0; --i) {

      const first = tasks[i];
      let parallels = this._parallel.get(first);

      if (!parallels) {
        parallels = new Set();
        this._parallel.set(first, parallels);
      }

      for (let j = i - 1; j >= 0; --j) {
        parallels.add(tasks[j]);
      }
    }
  }

  areParallel(first: ZTask, second: ZTask): boolean {
    return this._areParallel(first, second) || this._areParallel(second, first);
  }

  private _areParallel(first: ZTask, second: ZTask): boolean {
    for (const firstQ of this._qualifiersOf(first)) {

      const parallel = this._parallel.get(firstQ);

      if (parallel) {
        for (const secondQ of this._qualifiersOf(second)) {
          if (parallel.has(secondQ)) {
            return true;
          }
        }
      }
    }

    return false;
  }

}
