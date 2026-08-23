export interface DisposableRpcStub {
  [Symbol.dispose]?: () => void;
  dispose?: () => void;
}

/**
 * Safely disposes of a Cloudflare Workers RPC stub (WorkflowInstance / RpcStub / Disposable target).
 * Workerd tracks RPC capability handles and requires explicit disposal to prevent memory leaks and RPC warnings.
 */
export function disposeRpc(target: DisposableRpcStub | null | undefined): void {
  if (!target) return;
  try {
    if (Symbol.dispose in target) {
      target[Symbol.dispose]?.();
    } else if ('dispose' in target) {
      target.dispose?.();
    }
  } catch {
    // Non-RPC stubs or mock test stubs without disposal implementation are safely ignored
  }
}
