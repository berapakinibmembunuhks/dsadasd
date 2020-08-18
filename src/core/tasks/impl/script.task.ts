import type { ZExecutedProcess, ZJob } from '../../jobs';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class ScriptZTask extends AbstractZTask<ZTaskSpec.Script> {

  protected _execTask(job: ZJob<ZTaskSpec.Script>): ZExecutedProcess {
    return job.shell.execScript(job, this.name, job.call.params());
  }

}
