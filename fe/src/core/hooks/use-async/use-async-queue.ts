import * as React from "react";

/*  Example usage:
  //-- Multiple async operations queued in order
  const { enqueue } = useAsyncQueue();

  async function updateAll() {
    await enqueue(() => api.order.update(orderId, a));
    await enqueue(() => api.order.updateItem(orderId, b));
    await enqueue(() => api.order.updateSummary(orderId));
  }

  //-- Queue form submission
  const queue = useAsyncQueue();

  async function onSubmit(data) {
    await queue.enqueue(() => api.product.update(data));
  }
*/
export function useAsyncQueue() {
  const queueRef = React.useRef<Promise<any>>(Promise.resolve());

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    queueRef.current = queueRef.current.then(task, task);
    return queueRef.current;
  }

  return { enqueue };
}
