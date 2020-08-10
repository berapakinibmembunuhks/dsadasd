import { valueProvider } from '@proc7ts/primitives';
import { ZCallDetails } from './call-details';

describe('ZCallDetails', () => {
  describe('by', () => {
    it('reconstructs parameters', () => {
      expect(ZCallDetails.by().params().mutate()).toEqual({ attrs: {}, args: [] });
    });
    it('respects parameters', () => {
      expect(ZCallDetails.by({
        params: valueProvider({
          attrs: { attr: ['1'] },
          args: ['arg'],
        }),
      }).params().mutate()).toEqual({
        attrs: { attr: ['1'] },
        args: ['arg'],
      });
    });
    it('reconstructs plan', async () => {
      expect(await (ZCallDetails.by() as any).plan()).toBeUndefined();
    });
    it('respects plan', async () => {

      const planner = { name: 'planner' } as any;
      const plan = jest.fn();

      await ZCallDetails.by({ plan }).plan(planner);

      expect(plan).toHaveBeenCalledWith(planner);
    });
  });
});