// Lightweight, typed-friendly Event Bus with sync/async + return values
/* 
// 1) Đăng ký handler (có thể sync hoặc async)
on<number, number>("math:add10", (n) => n + 10);
on<number, number>("math:add10", async (n) => (n ?? 0) + 20);

// 2) Gọi đồng bộ, không chờ
const raw = emit<number, number>("math:add10", 5); // [15, Promise(25)]

// 3) Gọi tuần tự & chờ kết quả
const series = await emitSync<number, number>("math:add10", 5); // [15, 25]

// 4) Gọi song song & chờ kết quả
const parallel = await emitAsync<number, number>("math:add10", 5); // [15, 25]

// 5) Lấy kết quả đầu tiên khác undefined
const first = await emitFirst<number, number>("math:add10", 5); // 15

// 6) Gom kết quả bằng reduce
const sum = await emitReduce<number, number, number>(
  "math:add10",
  5,
  (acc, cur) => acc + cur,
  0
); // 40

// 7) Chờ 1 event tiếp theo (one-shot)
waitFor<string>("upload:done", 5000).then(console.log).catch(console.error);

// 8) Request/response nhẹ
on<string, string>("config:get-theme", () => "dark");
const theme = await request<undefined, string>("config:get-theme");

*/

export type Handler<T = unknown, R = unknown> = (payload: T) => R | Promise<R>;

type ListenerMap = Map<string, Set<Handler<any, any>>>;
const listeners: ListenerMap = new Map();

/** Đăng ký lắng nghe sự kiện. Trả về hàm unsubscribe. */
export function on<T = unknown, R = unknown>(
  event: string,
  handler: Handler<T, R>
): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler as Handler<any, any>);
  return () => off(event, handler);
}

/** Đăng ký 1 lần: tự động off sau lần đầu nhận. */
export function once<T = unknown, R = unknown>(
  event: string,
  handler: Handler<T, R>
): () => void {
  const wrapped: Handler<T, R> = async (payload: T) => {
    try {
      return await handler(payload);
    } finally {
      off(event, wrapped);
    }
  };
  return on(event, wrapped);
}

/** Hủy đăng ký một handler. */
export function off<T = unknown, R = unknown>(
  event: string,
  handler: Handler<T, R>
): void {
  listeners.get(event)?.delete(handler as Handler<any, any>);
}

/** Xóa tất cả handler của 1 event (hoặc toàn bộ). */
export function clear(event?: string): void {
  if (event) listeners.delete(event);
  else listeners.clear();
}

/** Kiểm tra có handler cho event không. */
export function has(event: string): boolean {
  return (listeners.get(event)?.size ?? 0) > 0;
}

/** Đếm số handler của event. */
export function count(event: string): number {
  return listeners.get(event)?.size ?? 0;
}

/* =========================================================
 *  EMIT (ĐỒNG BỘ) — gọi theo thứ tự đăng ký, KHÔNG await.
 *  Thu về mảng kết quả (có thể là Promise nếu handler trả Promise).
 *  Lưu ý: dùng emitSync nếu bạn cần chạy cực nhanh, không chờ.
 * ========================================================= */
export function emit<T = unknown, R = unknown>(
  event: string,
  payload?: T
): R[] {
  const set = listeners.get(event);
  if (!set || set.size === 0) return [];
  const results: R[] = [];
  for (const h of set) {
    results.push(h(payload));
  }
  return results;
}

/* =========================================================
 *  EMIT SYNC (CHẶN) — gọi lần lượt và CHỜ từng handler nếu trả Promise.
 *  Đảm bảo tuần tự (series) và BẮT LỖI từng handler.
 *  Trả về mảng kết quả đã resolve.
 * ========================================================= */
export async function emitSync<T = unknown, R = unknown>(
  event: string,
  payload?: T,
  opts?: { stopOnError?: boolean }
): Promise<R[]> {
  const set = listeners.get(event);
  if (!set || set.size === 0) return [];
  const results: R[] = [];
  for (const h of set) {
    try {
      const r = await h(payload);
      results.push(r as R);
    } catch (err) {
      if (opts?.stopOnError) throw err;
      // nuốt lỗi để tiếp tục handler tiếp theo
      // (có thể log ở đây)
    }
  }
  return results;
}

/* =========================================================
 *  EMIT ASYNC (PARALLEL) — chạy song song tất cả handler (nếu trả Promise).
 *  Nhanh hơn nếu không cần thứ tự. Trả về mảng kết quả đã resolve.
 * ========================================================= */
export async function emitAsync<T = unknown, R = unknown>(
  event: string,
  payload?: T,
  opts?: { stopOnError?: boolean }
): Promise<R[]> {
  const set = listeners.get(event);
  if (!set || set.size === 0) return [];
  const tasks = Array.from(set).map(async (h) => {
    return h(payload);
  });

  if (opts?.stopOnError) {
    // sẽ throw ngay khi 1 task lỗi (Promise.all behavior)
    return Promise.all(tasks) as Promise<R[]>;
  }

  // allSettled để không nổ toàn bộ nếu 1 handler lỗi
  const settled = await Promise.allSettled(tasks);
  const res: R[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") res.push(s.value as R);
    // if rejected -> bỏ qua (có thể log)
  }
  return res;
}

/* =========================================================
 *  EMIT FIRST — trả về KẾT QUẢ ĐẦU TIÊN khác undefined.
 *  Có 2 biến thể: tuần tự (series) hoặc song song (parallel-race).
 * ========================================================= */
export async function emitFirst<T = unknown, R = unknown>(
  event: string,
  payload?: T,
  opts?: { parallel?: boolean }
): Promise<R | undefined> {
  const set = listeners.get(event);
  if (!set || set.size === 0) return undefined;

  if (opts?.parallel) {
    // chạy song song và trả về kết quả đầu tiên !== undefined
    const tasks = Array.from(set).map(async (h) => {
      return h(payload);
    });
    // tự chế "race" có điều kiện
    return new Promise<R | undefined>((resolve) => {
      let settled = 0;
      const total = tasks.length;
      tasks.forEach((p) => {
        p.then((val) => {
          // lấy value hợp lệ đầu tiên
          if (val !== undefined) resolve(val as R);
        }).finally(() => {
          settled++;
          if (settled === total) resolve(undefined);
        });
      });
    });
  }

  // tuần tự: dừng ngay khi gặp kết quả !== undefined
  for (const h of set) {
    const val = await h(payload);
    if (val !== undefined) return val as R;
  }
  return undefined;
}

/* =========================================================
 *  EMIT REDUCE — gom kết quả qua 1 reducer.
 *  Ví dụ: gộp route menu, merge object config, tính tổng số, ...
 * ========================================================= */
export async function emitReduce<T = unknown, R = unknown, A = R>(
  event: string,
  payload: T | undefined,
  reducer: (acc: A, cur: R) => A,
  initial: A,
  opts?: { parallel?: boolean }
): Promise<A> {
  const results = opts?.parallel
    ? await emitAsync<T, R>(event, payload)
    : await emitSync<T, R>(event, payload);
  return results.reduce(reducer, initial);
}

/* =========================================================
 *  WAIT FOR — trả về Promise khi lần TỚI có event xảy ra (one-shot).
 *  Dùng được như "request/response" nhẹ nếu handler emit ngược lại.
 * ========================================================= */
export function waitFor<T = unknown>(event: string, timeoutMs?: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const offOnce = once<T, void>(event, (p) => {
      offOnce();
      resolve(p as T);
    });
    if (timeoutMs && timeoutMs > 0) {
      const t = setTimeout(() => {
        offOnce();
        reject(new Error(`waitFor timeout: ${event}`));
      }, timeoutMs);
      // tránh GC premature (tuỳ runtime)
      void t;
    }
  });
}

/* =========================================================
 *  REQUEST — pattern kiểu request/response: lấy KQ đầu tiên.
 *  Nhà cung cấp lắng nghe `event` và return data; caller nhận về kết quả.
 * ========================================================= */
export async function request<T = unknown, R = unknown>(
  event: string,
  payload?: T,
  opts?: { parallel?: boolean }
): Promise<R | undefined> {
  return emitFirst<T, R>(event, payload, { parallel: opts?.parallel });
}
