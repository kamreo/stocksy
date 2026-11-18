import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

@Injectable()
export class AssetSearchQueryPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.trim().length > 80
    ) {
      throw new BadRequestException(
        'Query q must contain between 1 and 80 characters.',
      );
    }
    return value.trim();
  }
}
