import { BadRequestException } from '@nestjs/common';
import { CreatePortfolioPipe } from './create-portfolio.pipe.js';

describe('CreatePortfolioPipe', () => {
  const pipe = new CreatePortfolioPipe();

  it('trims names and defaults to USD', () => {
    expect(pipe.transform({ name: '  Savings  ' })).toEqual({
      name: 'Savings',
      baseCurrency: 'USD',
    });
  });

  it.each(['usd', ' EUR ', 'pln'])(
    'normalizes supported currency %s',
    (currency) => {
      expect(
        pipe.transform({ name: 'Savings', baseCurrency: currency })
          .baseCurrency,
      ).toBe(currency.trim().toUpperCase());
    },
  );

  it('accepts the name length boundary', () => {
    expect(pipe.transform({ name: 'a'.repeat(80) }).name).toHaveLength(80);
  });

  it.each(
    [
      undefined,
      null,
      [],
      'Savings',
      1,
      {},
      { name: '' },
      { name: '   ' },
      { name: 123 },
      { name: 'a'.repeat(81) },
      { name: 'Savings', baseCurrency: null },
      { name: 'Savings', baseCurrency: 'USDT' },
      { name: 'Savings', baseCurrency: 1 },
      { name: 'Savings', userId: 'another-user' },
      { name: 'Savings', ownerId: 'another-user' },
      { name: 'Savings', extra: true },
    ].map((value) => ({ value })),
  )('rejects invalid input $value', ({ value }) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
