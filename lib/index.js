var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var name = "yunhei-api";
var inject = ["http"];
var Config = import_koishi.Schema.object({
  apiKey: import_koishi.Schema.string().required().description("云黑API密钥").role("secret").default(""),
  endpoint: import_koishi.Schema.string().description("API端点地址").default("https://api.example.com/yunhei"),
  rateLimit: import_koishi.Schema.number().min(1).max(100).step(1).description("API调用频率限制（次/分钟）").default(30).role("slider", { ticks: [10, 30, 50, 100] })
});
var requestQueue = /* @__PURE__ */ new Map();
var validateType = /* @__PURE__ */ __name((type) => ["none", "bilei", "yunhei"].includes(type?.toLowerCase()), "validateType");
function apply(ctx, config) {
  const { logger } = ctx;
  const catchNetworkError = /* @__PURE__ */ __name((err) => {
    logger.error(err);
    if (!err.response) throw new import_koishi.SessionError("未知网络错误");
    const { status, statusText } = err.response;
    const message = status >= 500 ? "服务器内部错误" : statusText || "未知网络错误";
    throw new import_koishi.SessionError(message);
  }, "catchNetworkError");
  ctx.setInterval(() => {
    requestQueue.clear();
    logger.debug("速率限制计数器已重置");
  }, 60 * 1e3);
  if (!config.apiKey) {
    logger.error("API密钥未配置，插件初始化失败");
    throw new Error("云黑API密钥未配置，请联系管理员");
  }
  ctx.command("yunhei <id:string>", "查询云黑信息").action(async ({ session }, id) => {
    if (!id) return "请输入要查询的ID";
    const logContext = { queryId: id, userId: session?.userId };
    const user = session?.userId || "system";
    const count = requestQueue.get(user) || 0;
    if (count >= config.rateLimit) {
      logger.warn(`用户触发频率限制`, { ...logContext, count });
      return `查询操作过于频繁 (${id})，请稍后再试`;
    }
    requestQueue.set(user, count + 1);
    const startTime = Date.now();
    logger.debug("开始API请求", logContext);
    const response = await ctx.http.get(config.endpoint, {
      responseType: "json",
      params: { id, key: config.apiKey },
      timeout: 5e3
    }).catch(catchNetworkError);
    const duration = Date.now() - startTime;
    logger.info(`API请求成功`, {
      ...logContext,
      duration
    });
    if (!response?.info?.[0]) {
      logger.error("API响应结构异常", { ...logContext, response });
      return `ID ${id} 的云黑数据格式异常，请联系管理员`;
    }
    const data = response.info[0];
    const type = validateType(data.type) ? data.type : "未知类型";
    return [
      `=== 云黑查询结果 ===`,
      `云黑状态：${data.yh || "未知"}`,
      `类型判定：${type}`,
      `原因说明：${data.note || "无记录"}`,
      `处理人员：${data.admin || "未知"}`,
      `记录日期：${data.date || "未知"}`
    ].join("\n");
  });
  logger.debug("插件配置已加载", {
    endpoint: config.endpoint,
    rateLimit: config.rateLimit,
    apiKey: config.apiKey ? `${config.apiKey.slice(0, 2)}****${config.apiKey.slice(-2)}` : "未配置"
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
