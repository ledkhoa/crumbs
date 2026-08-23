import { describe, expect, it } from 'bun:test';
import { disposeRpc } from './rpc';

describe('disposeRpc Utility', () => {
  it('should call [Symbol.dispose]() on Disposable objects', () => {
    let disposed = false;
    const disposableObj = {
      [Symbol.dispose]: () => {
        disposed = true;
      },
    };

    disposeRpc(disposableObj);
    expect(disposed).toBe(true);
  });

  it('should fallback to .dispose() if [Symbol.dispose] is not defined', () => {
    let disposed = false;
    const disposableObj = {
      dispose: () => {
        disposed = true;
      },
    };

    disposeRpc(disposableObj);
    expect(disposed).toBe(true);
  });

  it('should safely handle null or undefined', () => {
    expect(() => disposeRpc(null)).not.toThrow();
    expect(() => disposeRpc(undefined)).not.toThrow();
  });
});
