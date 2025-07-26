import { describe, expect, test } from 'vitest';
import { pLimit } from '../src/index';

function delay(ms: number) {
	return new Promise(r => setTimeout(r, ms));
}

function inRange(num: number, { start = 0, end = 0 }) {
	const min = (left: number, right: number) => (left < right ? left : right);
	const max = (left: number, right: number) => (left > right ? left : right);
	return num >= min(start, end) && num <= max(end, start);
}

function timeSpan() {
	const start = process.hrtime();
	const end = () => {
		const hrtime = process.hrtime(start);
		const nanoseconds = hrtime[0] * 1e9 + hrtime[1];
		return nanoseconds / 1e6; // ms
	};
	return () => end();
}

function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

////////////////////////////////////////////////////////////////////////////////

describe(`pLimit`, () => {
	test('throws on invalid concurrency argument', () => {
		const err = /Expected `concurrency` to be a number greater than 1/;

		expect(() => pLimit(0)).toThrowError(err);
		expect(() => pLimit(-1)).toThrowError(err);
		expect(() => pLimit(1.2)).toThrowError(err);
		// @ts-expect-error Testing bad input
		expect(() => pLimit(undefined)).toThrowError(err);
		// @ts-expect-error Testing bad input
		expect(() => pLimit(true)).toThrowError(err);
	});

	test('should handle `concurrency = 1`', async () => {
		const input: [number, number][] = [
			[10, 300],
			[20, 200],
			[30, 100],
		];

		const end = timeSpan();
		const limit = pLimit(1);

		const mapper = ([value, ms]) =>
			limit(async () => {
				await delay(ms);
				return value;
			});

		const result = await Promise.all(input.map(x => mapper(x)));
		expect(result).toEqual([10, 20, 30]);
		expect(inRange(end(), { start: 590, end: 650 })).toEqual(true);
	});

	test('should handle `concurrency = 5`', async () => {
		const concurrency = 5;
		let running = 0;

		const limit = pLimit(concurrency);

		const input = Array.from({ length: 100 }, () =>
			limit(async () => {
				running++;
				expect(running <= concurrency).toEqual(true);
				await delay(randomInt(30, 200));
				running--;
			}),
		);

		await Promise.all(input);
	});

	test('should handle non-promise returning function', async () => {
		const limit = pLimit(1);

		let thrown = false;
		try {
			await limit(() => null);
		} catch (_) {
			thrown = true;
		}

		expect(thrown).toEqual(false);
	});

	test('should continue after a sync throw', async () => {
		const limit = pLimit(1);
		let ran = false;

		const promises = [
			limit(() => {
				throw new Error('err');
			}),
			limit(() => {
				ran = true;
			}),
		];

		await Promise.all(promises).catch(() => {});

		expect(ran).toEqual(true);
	});

	test('should accept additional arguments', async () => {
		const limit = pLimit(1);
		const symbol = Symbol('test');

		await limit(a => {
			expect(a).toEqual(symbol);
		}, symbol);
	});

	test('should surface errors in limited functions', async () => {
		const limit = pLimit(1);
		const error = new Error('err');

		const promises = [
			limit(async () => {
				await delay(30);
			}),
			limit(async () => {
				await delay(80);
				throw error;
			}),
			limit(async () => {
				await delay(50);
			}),
		];

		try {
			await Promise.all(promises);
		} catch (err) {
			expect(err).toEqual(error);
		}
	});

	test('should update `activeCount` and `pendingCount` properties', async () => {
		const limit = pLimit(5);
		expect(limit.activeCount).toEqual(0);
		expect(limit.pendingCount).toEqual(0);

		const runningPromise1 = limit(() => delay(1000));
		expect(limit.activeCount).toEqual(0);
		expect(limit.pendingCount).toEqual(1);

		await Promise.resolve();
		expect(limit.activeCount).toEqual(1);
		expect(limit.pendingCount).toEqual(0);

		await runningPromise1;
		expect(limit.activeCount).toEqual(0);
		expect(limit.pendingCount).toEqual(0);

		const immediatePromises = Array.from({ length: 5 }, () =>
			limit(() => delay(1000)),
		);
		const delayedPromises = Array.from({ length: 3 }, () =>
			limit(() => delay(1000)),
		);

		await Promise.resolve();
		expect(limit.activeCount).toEqual(5);
		expect(limit.pendingCount).toEqual(3);

		await Promise.all(immediatePromises);
		expect(limit.activeCount).toEqual(3);
		expect(limit.pendingCount).toEqual(0);

		await Promise.all(delayedPromises);
		expect(limit.activeCount).toEqual(0);
		expect(limit.pendingCount).toEqual(0);
	});

	test('should clear the current queue on `clearQueue`', async () => {
		const limit = pLimit(1);

		Array.from({ length: 1 }, () => limit(() => delay(1000)));
		Array.from({ length: 3 }, () => limit(() => delay(1000)));

		await Promise.resolve();
		expect(limit.pendingCount).toEqual(3);
		limit.clearQueue();
		expect(limit.pendingCount).toEqual(0);
	});
});
