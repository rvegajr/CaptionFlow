import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '../services/id-generator.js';

export class UuidIdGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}
