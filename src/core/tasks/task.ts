/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from '../packages';
import type { ZCall, ZCallInstruction, ZCallPlanner, ZTaskParams } from '../plan';
import type { ZTaskSpec } from './task-spec';

/**
 * Execution task.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZTask<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

  /**
   * Target package the task is applied to.
   */
  readonly target: ZPackage;

  /**
   * Task name.
   */
  readonly name: string;

  /**
   * Task specifier.
   */
  readonly spec: ZTaskSpec<TAction>;

  /**
   * Builds initial task execution parameters.
   *
   * @returns Partial task execution parameters.
   */
  params(): ZTaskParams.Partial;

  /**
   * Plans this task execution.
   *
   * Records initial task execution instructions.
   *
   * @param planner  Task execution planner to record instructions to.
   *
   * @returns Either nothing when instructions recorded synchronously, or a promise-like instance resolved when
   * instructions recorded asynchronously.
   */
  plan(planner: ZCallPlanner<TAction>): void | PromiseLike<unknown>;

  /**
   * Represents this task as a dependency of another one.
   *
   * By default a {@link ZTaskSpec.Group grouping task} treats the first argument as a sub-task name, an the rest of
   * arguments as arguments to this sub-task. The tasks of all other types record a call to this as is.
   *
   * @param dependent  Depending task execution call.
   * @param dep  Dependency specifier.
   *
   * @returns A potentially asynchronous iterable of {@link ZCallInstruction dependency call instructions}.
   */
  asDepOf(
      dependent: ZCall,
      dep: ZTaskSpec.TaskRef,
  ): Iterable<ZCallInstruction> | AsyncIterable<ZCallInstruction>;

}
