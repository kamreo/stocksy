import { BadRequestException } from '@nestjs/common';
import { AssetSearchQueryPipe } from './asset-search-query.pipe.js';

describe('AssetSearchQueryPipe', () => {
  const pipe = new AssetSearchQueryPipe();

  it('trims a valid query', () => expect(pipe.transform(' BTC ')).toBe('BTC'));
  it('accepts the length boundary', () =>
    expect(pipe.transform('a'.repeat(80))).toHaveLength(80));
  it.each(
    [undefined, null, '', '   ', 1, {}, ['BTC', 'ETH'], 'a'.repeat(81)].map(
      (value) => ({ value }),
    ),
  )('rejects invalid query $value', ({ value }) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
