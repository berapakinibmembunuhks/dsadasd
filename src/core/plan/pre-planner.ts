/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZBatching } from '../batches';
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZCall } from './call';
import type { ZCallDetails } from './call-details';
import type { ZCallPlanner } from './call-planner';

/**
 * A planner of prerequisite call.
 *
 * Passed to {@link ZTask.callAsPre} to record prerequisite calls.
 */
export interface ZPrePlanner {

  /**
   * A planner of the call to the task depending on this prerequisite.
   */
  readonly dependent: ZCallPlanner;

  /**
   * Batching policy to apply when batch transient prerequisites.
   */
  readonly batching: ZBatching;

  /**
   * Records a call to prerequisite task.
   *
   * Updates already recorded call to the same task.
   *
   * @typeparam TAction  Task action type.
   * @param task  The task to call.
   * @param details  The details of the call.
   *
   * @returns A promise resolved to the task call when it is recorded.
   */
  callPre<TAction extends ZTaskSpec.Action>(
      this: void,
      task: ZTask<TAction>,
      details?: ZCallDetails<TAction>,
  ): Promise<ZCall>;

  /**
   * Builds a new prerequisites planner based on this one with updated batching policy for prerequisites.
   *
   * @param batching  New prerequisites batching policy.
   *
   * @returns Either new prerequisites planner, or this one if batching policy is unspecified.
   */
  batchWith(batching: ZBatching | null | undefined): ZPrePlanner;

}
