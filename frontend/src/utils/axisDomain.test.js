import { computeAxisDomain } from './axisDomain';

test.each([
  [[4], { integer: true }, [0, 5]],
  [[2, 2, 2], { integer: true }, [0, 5]],
  [[0, 0], { integer: true }, [0, 5]],
  [[-8, -2], { integer: true, canBeNegative: true }, [-9, -1]],
  [[-2, 3], { integer: true, canBeNegative: true }, [-3, 4]],
  [[0.2, 0.8], {}, [0, 1]],
  [[0, 100000], { integer: true }, [0, 120000]],
  [[0, 10], { integer: true }, [0, 12]],
])('computes stable domains for %j', (values, options, expected) => {
  expect(computeAxisDomain(values, options)).toEqual(expected);
});

test('returns a safe default for empty data', () => {
  expect(computeAxisDomain([])).toEqual([0, 0.5]);
  expect(computeAxisDomain([], { canBeNegative: true })).toEqual([-1, 1]);
});
