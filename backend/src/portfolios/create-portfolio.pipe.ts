import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

export interface CreatePortfolioInput {
  name: string;
  baseCurrency: string;
}

@Injectable()
export class CreatePortfolioPipe implements PipeTransform<
  unknown,
  CreatePortfolioInput
> {
  transform(value: unknown): CreatePortfolioInput {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Body must be a JSON object.');
    }
    if (
      Object.keys(value).some((key) => key !== 'name' && key !== 'baseCurrency')
    ) {
      throw new BadRequestException('Only name and baseCurrency are allowed.');
    }

    const input = value as Record<string, unknown>;
    if (
      typeof input.name !== 'string' ||
      !input.name.trim() ||
      input.name.trim().length > 80
    ) {
      throw new BadRequestException(
        'Name must contain between 1 and 80 characters.',
      );
    }
    const currency =
      input.baseCurrency === undefined ? 'USD' : input.baseCurrency;
    if (
      typeof currency !== 'string' ||
      !['USD', 'EUR', 'PLN'].includes(currency.trim().toUpperCase())
    ) {
      throw new BadRequestException('Base currency must be USD, EUR or PLN.');
    }
    return {
      name: input.name.trim(),
      baseCurrency: currency.trim().toUpperCase(),
    };
  }
}
