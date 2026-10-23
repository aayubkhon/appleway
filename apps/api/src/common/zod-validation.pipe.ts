import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

export interface ValidationIssue {
  path: string;
  message: string;
}

/**
 * Validates a request part against a zod schema and hands the parsed value to
 * the handler. Issues name the field and the rule, never the submitted value,
 * so a rejected password does not end up in a response or a log.
 */
@Injectable()
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<TSchema>
> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      throw new BadRequestException({ message: 'validation failed', issues });
    }

    return result.data;
  }
}
