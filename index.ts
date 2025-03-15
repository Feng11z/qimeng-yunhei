import { Context, Schema, Logger, h } from 'koishi'
import axios, { AxiosError, AxiosResponse } from 'axios'

const logger = new Logger('yunhei-api')

export interface IApiResponse {
  info?: Array<{
    yh?: string
    type?: string
    note?: string
    admin?: string
    date?: string
    level?: string
  }>
}

export const name = 'yunhei-api'

export interface Config {
  apiKey: string
  endpoint: string
  rateLimit: number
}

export const Config: Schema<Config> = Schema.object({
  apiKey: Schema.string()
    .required()
    .description('云黑API密钥')
    .role('secret')
    .default(''),
  endpoint: Schema.string()
    .description('API端点地址')
    .default('http://yunhei.qimeng.fun:12301/OpenAPI.php'),
  rateLimit: Schema.number()
    .min(1)
    .max(100)
    .step(1)
    .description('API调用频率限制（次/分钟）')
    .default(30)
    .role('slider', { ticks: [10, 30, 50, 100] })
})

const requestQueue = new Map<string, number>()
let rateLimitTimer: NodeJS.Timeout

const validateType = (type: string): boolean => 
  ['none', 'bilei', 'yunhei'].includes(type?.toLowerCase())

export function apply(ctx: Context, config: Config) {
  rateLimitTimer = setInterval(() => {
    requestQueue.clear()
    logger.debug('速率限制计数器已重置')
  }, 60 * 1000)

  ctx.on('dispose', () => {
    clearInterval(rateLimitTimer)
    logger.info('资源清理完成')
  })

  if (!config.apiKey) {
    logger.error('API密钥未配置，插件初始化失败')
    throw new Error('云黑API密钥未配置，请联系管理员')
  }

  ctx.command('yunhei <id:string>', '查询云黑信息')
    .action(async ({ session }, id) => {
      if (!id) return '请输入要查询的ID'
      const logContext = { queryId: id, userId: session?.userId }

      // 速率限制检查
      const user = session?.userId || 'system'
      const count = (requestQueue.get(user) || 0
      if (count >= config.rateLimit) {
        logger.warn(`用户触发频率限制`, { ...logContext, count })
        return `查询操作过于频繁 (${id})，请稍后再试`
      }
      requestQueue.set(user, count + 1)

      try {
        const startTime = Date.now()
        logger.debug('开始API请求', logContext)
        
        const response = await axios.get<IApiResponse>(config.endpoint, {
          params: { id, key: config.apiKey },
          timeout: 5000,
          validateStatus: (status) => status >= 200 && status < 500
        })

        const duration = Date.now() - startTime
        logger.info(`API请求成功`, { ...logContext, duration, status: response.status })

        // 数据结构校验
        if (!response.data?.info?.[0]) {
          logger.error('API响应结构异常', { ...logContext, response: response.data })
          return `ID ${id} 的云黑数据格式异常，请联系管理员`
        }

        const data = response.data.info[0]
        const type = validateType(data.type) ? data.type : '未知类型'

        return [
          `=== 云黑查询结果 ===`,
          `云黑状态：${data.yh || '未知'}`,
          `类型判定：${type}`,
          `原因说明：${data.note || '无记录'}`,
          `处理人员：${data.admin || '未知'}`,
          `记录日期：${data.date || '未知'}`
        ].join('\n')

      } catch (error) {
        const err = error as AxiosError
        const errorMessage = err.response?.data?.message || err.message
        
        logger.error('API请求失败', {
          ...logContext,
          error: errorMessage,
          code: err.code,
          status: err.response?.status
        })

        const safeId = id.length > 6 ? `${id.slice(0, 3)}***${id.slice(-3)}` : id
        return [
          h.quote(session?.messageId),
          `[${safeId}] 查询失败：`,
          session?.type === 'private' ? errorMessage : '请稍后重试'
        ].join('\n')
      }
    })

  logger.debug('插件配置已加载', { 
    endpoint: config.endpoint,
    rateLimit: config.rateLimit,
    apiKey: config.apiKey ? `${config.apiKey.slice(0, 2)}****${config.apiKey.slice(-2)}` : '未配置'
  })
}