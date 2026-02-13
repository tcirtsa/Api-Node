/**
 * @file server/metric-stream.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

/**
 * 符号：normalizeJson（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeJson = (payload) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!payload) return [];
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.metrics)) return payload.metrics;
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return [payload];
};

/**
 * 符号：safeJsonParse（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含 try/catch，说明该路径显式处理异常。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const safeJsonParse = (text) => {
  // 步骤 1：对可能失败的操作进行异常保护，避免单点错误中断整体流程。
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * 符号：startMetricStreamConsumer（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const startMetricStreamConsumer = async (options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const provider = String(process.env.METRIC_STREAM_PROVIDER || "off").toLowerCase();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const onMetrics = typeof options.onMetrics === "function" ? options.onMetrics : () => {};

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (provider === "off" || provider === "disabled") {
    return { stop: async () => {} };
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (provider === "kafka") {
    try {
      const { Kafka } = await import("kafkajs");
      const brokers = String(process.env.KAFKA_BROKERS || "localhost:9092")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const topic = String(process.env.KAFKA_TOPIC || "api-metrics");
      const groupId = String(process.env.KAFKA_GROUP_ID || "api-alert-engine");
      const kafka = new Kafka({ clientId: "api-alert-engine", brokers });
      const consumer = kafka.consumer({ groupId });
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false });

      await consumer.run({
        eachMessage: async ({ message }) => {
          const payloadText = message.value ? message.value.toString("utf8") : "";
          const parsed = safeJsonParse(payloadText);
          if (!parsed) return;
          const items = normalizeJson(parsed);
          if (items.length) onMetrics(items);
        },
      });

      return {
        stop: async () => {
          await consumer.disconnect();
        },
      };
    } catch (error) {
      console.error("[metric-stream] kafka consumer failed to start", error);
      return { stop: async () => {} };
    }
  }

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (provider === "rabbitmq" || provider === "rabbit") {
    try {
      const amqp = await import("amqplib");
      const url = String(process.env.RABBIT_URL || "amqp://localhost");
      const queue = String(process.env.RABBIT_QUEUE || "api-metrics");
      const connection = await amqp.connect(url);
      const channel = await connection.createChannel();
      await channel.assertQueue(queue, { durable: true });

      const handler = async (msg) => {
        if (!msg) return;
        const payloadText = msg.content ? msg.content.toString("utf8") : "";
        const parsed = safeJsonParse(payloadText);
        if (parsed) {
          const items = normalizeJson(parsed);
          if (items.length) onMetrics(items);
        }
        channel.ack(msg);
      };

      channel.consume(queue, handler, { noAck: false });

      return {
        stop: async () => {
          await channel.close();
          await connection.close();
        },
      };
    } catch (error) {
      console.error("[metric-stream] rabbitmq consumer failed to start", error);
      return { stop: async () => {} };
    }
  }

  console.error(`[metric-stream] unknown provider: ${provider}`);
  // 步骤 5：返回当前结果并结束函数，明确本路径的输出语义。
  return { stop: async () => {} };
};




