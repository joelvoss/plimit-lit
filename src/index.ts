import { Queue } from 'queue-lit';

type GetFuncT<F extends Func<unknown>> = F extends Func<infer T> ? T : unknown;

type Args = unknown[];
type Func<T> = (...args: Args) => PromiseLike<T> | Promise<T> | T;
type Resolve<T> = (value: T | PromiseLike<T>) => void;

type RunFn = <T>(fn: Func<T>, resolve: Resolve<T>, args: Args) => Promise<void>;
type EnqueueFn = <T>(fn: Func<T>, resolve: Resolve<T>, args: Args) => void;
type GeneratorFn = <T>(fn: Func<T>, ...args: Args) => Promise<T>;

type Limiter = GeneratorFn & {
	activeCount: number;
	pendingCount: number;
	clearQueue: () => void;
};

/**
 * pLimit creates a "limiter" function that can be used to enqueue
 * promise returning functions with limited concurrency.
 */
export function pLimit(concurrency: number) {
	if (
		!(
			(Number.isInteger(concurrency) || concurrency === Infinity) &&
			concurrency > 0
		)
	) {
		throw new TypeError('Expected `concurrency` to be a number greater than 1');
	}

	const queue = new Queue();
	let activeCount = 0;

	/**
	 * next updates the activeCount and executes the next queued item.
	 */
	const next = () => {
		activeCount--;

		if (queue.size > 0) {
			(queue.pop() as () => void)();
		}
	};

	/**
	 * run executes a given `fn` passing `args`. Inside the `run` closure any
	 * thrown errors/rejections are swallowed, but by resolving the `fn` result
	 * immediatly we surface any rejections/errors to a parent function.
	 */
	const run: RunFn = async (fn, resolve, args) => {
		activeCount++;

		const result = (async () => fn(...args))();

		resolve(result);

		try {
			await result;
		} catch {
			/* swallow */
		}

		next();
	};

	/**
	 * enqueue enqueues a given `fn` to be executed while limiting concurrency.
	 */
	const enqueue: EnqueueFn = (fn, resolve, args) => {
		queue.push((run<GetFuncT<typeof fn>>).bind(null, fn, resolve, args));

		(async () => {
			// NOTE(joel): This function needs to wait until the next microtask
			// before comparing `activeCount` to `concurrency` because `activeCount`
			// is updated asynchronously when the run function is popped and
			// called.
			await Promise.resolve();

			if (activeCount < concurrency && queue.size > 0) {
				(queue.pop() as () => void)();
			}
		})();
	};

	/**
	 * generator defines the public api of `pLimit` and allows enqueueing promise
	 * returning functions while limiting their concurrency.
	 */
	const generator: GeneratorFn = (fn, ...args) =>
		new Promise(resolve => {
			enqueue(fn, resolve, args);
		});

	Object.defineProperties(generator, {
		activeCount: {
			get: () => activeCount,
		},
		pendingCount: {
			get: () => queue.size,
		},
		clearQueue: {
			value: () => {
				queue.clear();
			},
		},
	});

	return generator as Limiter;
}
