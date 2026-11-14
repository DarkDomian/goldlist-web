import type { GoldlistDatabase } from "@/data/db";
import { nextLocalMidnight, processCutoffs } from "@/domain/scheduling";

export class AsyncMutex {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    this.tail = result.catch(() => undefined);
    return result;
  }
}

export async function runCutoff(
  database: GoldlistDatabase,
  now: Date = new Date(),
): Promise<number> {
  const cards = await database.cards.where("status").equals("copper").toArray();
  const updates = processCutoffs(cards, now);

  if (updates.length > 0) {
    await database.cards.bulkPut(updates);
  }

  return updates.length;
}

export interface SchedulerOptions {
  database?: GoldlistDatabase;
  mutex: AsyncMutex;
  performCutoff?: () => Promise<number>;
  now?: () => Date;
  setTimeoutImpl?: typeof setTimeout;
  clearTimeoutImpl?: typeof clearTimeout;
  onError?: (error: unknown) => void;
}

export interface Scheduler {
  start(): void;
  stop(): void;
  checkNow(): Promise<void>;
}

export function createScheduler(options: SchedulerOptions): Scheduler {
  const {
    database,
    mutex,
    now = () => new Date(),
    setTimeoutImpl = setTimeout,
    clearTimeoutImpl = clearTimeout,
    onError,
  } = options;

  const performCutoff =
    options.performCutoff ??
    (async () => {
      if (!database) {
        return 0;
      }
      return runCutoff(database, now());
    });

  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let running = false;

  const arm = () => {
    if (stopped) {
      return;
    }
    if (timer !== undefined) {
      clearTimeoutImpl(timer);
    }
    const delay = Math.max(
      1_000,
      nextLocalMidnight(now()).getTime() - now().getTime() + 250,
    );
    timer = setTimeoutImpl(() => {
      void checkNow();
    }, delay);
  };

  const checkNow = async () => {
    if (stopped || running) {
      return;
    }

    running = true;
    try {
      await mutex.run(performCutoff);
    } catch (error) {
      onError?.(error);
    } finally {
      running = false;
      arm();
    }
  };

  const handleVisibility = () => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      void checkNow();
    }
  };

  const handleFocus = () => {
    void checkNow();
  };

  return {
    start() {
      stopped = false;
      void checkNow();
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", handleVisibility);
      }
      if (typeof window !== "undefined") {
        window.addEventListener("focus", handleFocus);
      }
    },
    stop() {
      stopped = true;
      if (timer !== undefined) {
        clearTimeoutImpl(timer);
        timer = undefined;
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
      }
    },
    checkNow,
  };
}
