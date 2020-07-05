import { InvalidZTaskError } from './invalid-task-error';
import { ZTaskParser } from './task-parser';

describe('ZTaskParser', () => {

  let parser: ZTaskParser;

  beforeEach(() => {
    parser = new ZTaskParser();
  });

  it('recognizes native task', () => {

    const spec = parser.parse('some command');

    expect(spec.isNative).toBe(true);
    expect(spec.deps).toHaveLength(0);
    expect(spec.args).toHaveLength(0);
  });
  it('treats task with comment as native', () => {

    const spec = parser.parse('run-z command #comment');

    expect(spec.isNative).toBe(true);
    expect(spec.deps).toHaveLength(0);
    expect(spec.args).toHaveLength(0);
  });
  it('treats task with shell commands as native', () => {

    const spec = parser.parse('run-z command > out');

    expect(spec.isNative).toBe(true);
    expect(spec.deps).toHaveLength(0);
    expect(spec.args).toHaveLength(0);
  });
  it('treats task with environment variable substitution as native', () => {

    const spec = parser.parse('run-z comm${some_env}');

    expect(spec.isNative).toBe(true);
    expect(spec.deps).toHaveLength(0);
    expect(spec.args).toHaveLength(0);
  });
  it('recognizes dependencies', () => {

    const spec = parser.parse('run-z dep1 dep2 dep3');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
        { task: 'dep1', parallel: false, attrs: {}, args: [] },
        { task: 'dep2', parallel: false, attrs: {}, args: [] },
        { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
  });
  it('recognizes arguments', () => {

    const spec = parser.parse('run-z dep1 dep2 dep3 --then command');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--then', 'command']);
  });
  it('recognizes dependency argument', () => {

    const spec = parser.parse('run-z dep1 dep2//-a //dep3 --then command');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--then', 'command']);
  });
  it('recognizes shorthand dependency argument', () => {

    const spec = parser.parse('run-z dep1 dep2/-a dep3 --then command');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--then', 'command']);
  });
  it('recognizes multiple dependency arguments', () => {

    const spec = parser.parse('run-z dep1 dep2//-a// //-b// //-c//dep3 --then command');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a', '-b', '-c'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--then', 'command']);
  });
  it('recognizes multiple shorthand dependency arguments', () => {

    const spec = parser.parse('run-z dep1 dep2/-a /-b //-c///-d dep3 --then command');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a', '-b', '-c', '-d'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--then', 'command']);
  });
  it('ignores empty dependency arguments', () => {

    const spec = parser.parse('run-z dep1 dep2 //// dep3 --then command');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--then', 'command']);
  });
  it('ignores empty shorthand dependency arguments', () => {

    const spec = parser.parse('run-z dep1 dep2/ / dep3 --then command');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--then', 'command']);
  });
  it('recognizes parallel dependencies', () => {

    const spec = parser.parse('run-z dep1,dep2, dep3 dep4');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: true, attrs: {}, args: [] },
      { task: 'dep3', parallel: true, attrs: {}, args: [] },
      { task: 'dep4', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
  });
  it('recognizes parallel dependency arguments', () => {

    const spec = parser.parse('run-z dep1//-a//,dep2 //-b//, dep3');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: ['-a'] },
      { task: 'dep2', parallel: true, attrs: {}, args: ['-b'] },
      { task: 'dep3', parallel: true, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
  });
  it('recognizes parallel dependency shorthand arguments', () => {

    const spec = parser.parse('run-z dep1/-a/-b /-c,dep2 /-d, dep3');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: ['-a', '-b', '-c'] },
      { task: 'dep2', parallel: true, attrs: {}, args: ['-d'] },
      { task: 'dep3', parallel: true, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
  });
  it('recognizes package path', () => {

    const spec = parser.parse('run-z dep1 ./path/to/package dep2');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { host: './path/to/package' },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
  });
  it('recognizes attributes', () => {

    const spec = parser.parse('run-z attr1=val1 attr2= =attr3 attr3=val3');

    expect(spec.isNative).toBe(false);
    expect(spec.attrs).toEqual({
      attr1: ['val1'],
      attr2: [''],
      attr3: ['', 'val3'],
    });
  });
  it('recognizes dependency attributes', () => {

    const spec = parser.parse('run-z attr1=val1 dep/attr2=/=attr3/arg1/--arg2=2/attr3=val3');

    expect(spec.deps).toEqual([
      {
        task: 'dep',
        parallel: false,
        attrs: { attr2: [''], attr3: ['', 'val3'] },
        args: ['arg1', '--arg2=2'],
      },
    ]);
    expect(spec.attrs).toEqual({ attr1: ['val1'] });
  });
  it('throws on arguments without dependency', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z   //-a//   task');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('//-a// task');
    expect(error.position).toBe(0);
  });
  it('throws on shorthand argument without dependency', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z   /-a   task');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('/-a task');
    expect(error.position).toBe(0);
  });
  it('throws on arguments after comma', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z  task1,  //-a//   task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1, //-a// task2');
    expect(error.position).toBe(7);
  });
  it('throws on shorthand argument after comma', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z  task1,  /-a   task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1, /-a task2');
    expect(error.position).toBe(7);
  });
  it('throws on arguments after comma within the same entry', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z  task1,//-a//   task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1,//-a// task2');
    expect(error.position).toBe(6);
  });
  it('throws on shorthand argument after comma within the same entry', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z  task1,/-a   task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1,/-a task2');
    expect(error.position).toBe(6);
  });
  it('throws on arguments after comma inside entry', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z  task1,//-a//task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1,//-a//task2');
    expect(error.position).toBe(6);
  });
  it('throws on shorthand argument after comma inside entry', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z  task1,/-a,task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1,/-a,task2');
    expect(error.position).toBe(6);
  });
});