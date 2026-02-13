/**
 * @file src/app/lib/polling.ts
 * 文件作用：前端基础库文件，封装 API 客户端、轮询、格式化和类型约束。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

/**
 * 符号：startVisibilityAwarePolling（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export const startVisibilityAwarePolling = (
  callback: () => void | Promise<void>,
  intervalMs: number,
) => {
  const tick = () => {
    if (document.visibilityState === "hidden") {
      return;
    }
    void callback();
  };

  const timer = window.setInterval(tick, intervalMs);
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      void callback();
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
};


