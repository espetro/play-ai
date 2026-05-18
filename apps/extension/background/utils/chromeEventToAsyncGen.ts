export async function* chromeEventToAsyncGen<T>(
  attach: (listener: (arg: T) => void | Promise<void>) => () => void,
  signal?: AbortSignal,
): AsyncGenerator<T> {
  const queue: T[] = [];
  let notify: (() => void) | null = null;

  const listener = (arg: T) => {
    queue.push(arg);
    notify?.();
    notify = null;
  };

  const detach = attach(listener);
  try {
    while (!signal?.aborted) {
      if (queue.length > 0) {
        yield queue.shift()!;
      } else {
        await new Promise<void>((res) => {
          notify = res;
        });
      }
    }
  } finally {
    detach();
  }
}
