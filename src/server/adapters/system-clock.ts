import type { Clock } from '../services/clock.js';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
