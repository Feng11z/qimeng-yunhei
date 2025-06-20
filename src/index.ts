import { Context, Schema, h, HTTP, SessionError } from 'koishi'
import {} from '@koishijs/plugin-http'

export const name = 'yunhei-api'

export const inject = [ 'http' ]

// 更新接口定义以匹配实际的API响应
export interface IApiResponse {
  info?: Array<{
    user?: string
    tel?: string
    wx?: string
    zfb?: string
    shiming?: string
    group_num?: string
    m_send_num?: string
    send_num?: string
    first_send?: string
    last_send?: string
    yh?: string
    type?: string
    note?: string
    admin?: string
    level?: string
    date?: string
  }>
}

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
    .default('https://api.example.com/yunhei'),
  rateLimit: Schema.number()
    .min(1)
    .max(100)
    .step(1)
    .description('API调用频率限制（次/分钟）')
    .default(30)
    .role('slider', { ticks: [10, 30, 50, 100] })
})

const requestQueue = new Map<string, number>()

const validateType = (type: string): boolean => 
  ['none', 'bilei', 'yunhei'].includes(type?.toLowerCase())

export function apply(ctx: Context, config: Config) {
  const { logger } = ctx

  const catchNetworkError = (err: HTTP.Error) => {
    logger.error(err)
    
    if (!err.response) throw new SessionError('未知网络错误')
    const { status, statusText } = err.response
          
    const message = status >= 500 
      ? '服务器内部错误' 
      : statusText || '未知网络错误'
    throw new SessionError(message)
  }

  ctx.setInterval(() => {
    requestQueue.clear()
    logger.debug('速率限制计数器已重置')
  }, 60 * 1000)

  if (!config.apiKey) {
    logger.error('API密钥未配置，插件初始化失败')
    throw new Error('云黑API密钥未配置，请联系管理员')
  }

  ctx.command('yunhei <id:string>', '查询云黑信息')
    .action(async ({ session }, id) => {
      if (!id) return '请输入要查询的ID'
      const logContext = { queryId: id, userId: session?.userId }

      try {
        // 速率限制检查
        const user = session?.userId || 'system'
        const count = (requestQueue.get(user) || 0)
        if (count >= config.rateLimit) {
          logger.warn(`用户触发频率限制`, { ...logContext, count })
          return `查询操作过于频繁 (${id})，请稍后再试`
        }
        requestQueue.set(user, count + 1)

        const startTime = Date.now()
        
        // 记录请求URL（脱敏处理密钥）
        const maskedKey = config.apiKey ? `${config.apiKey.slice(0, 2)}****${config.apiKey.slice(-2)}` : '未配置'
        const requestUrl = `${config.endpoint}?id=${id}&key=${maskedKey}`
        logger.debug('开始API请求', { ...logContext, requestUrl })
        
        const response = await ctx.http.get<IApiResponse>(config.endpoint, {
          responseType: 'json',
          params: { id, key: config.apiKey },
          timeout: 5000,
        }).catch(catchNetworkError)

        const duration = Date.now() - startTime
        
        // 在日志中显示完整的API响应JSON
        const responseJson = JSON.stringify(response, null, 2)
        logger.info(`API请求成功`, { 
          ...logContext, 
          duration,
          response: responseJson
        })

        // 检查响应结构 - 更宽松的检查
        if (!response?.info) {
          logger.error('API响应结构异常', { 
            ...logContext, 
            response: responseJson
          })
          return `ID ${id} 的云黑数据格式异常，请联系管理员`
        }

        // 处理可能的多种响应格式
        let data: any = {}
        
        // 情况1：响应是单个对象数组（如日志中的响应）
        if (response.info.length === 1 && typeof response.info[0] === 'object') {
          data = response.info[0]
        }
        // 情况2：响应是多个对象数组（如您手动查询的响应）
        else if (response.info.length > 1) {
          // 合并所有对象字段
          data = Object.assign({}, ...response.info)
        }
        // 情况3：未知格式
        else {
          logger.error('未知的API响应格式', { 
            ...logContext, 
            response: responseJson
          })
          return `ID ${id} 的云黑数据格式未知，请联系管理员`
        }

        const type = validateType(data.type) ? data.type : '未知类型'

        // 构建响应消息
        return [
          `=== 云黑查询结果 ===`,
          data.user && `用户ID：${data.user}`,
          `--- 基础信息 ---`,
          data.tel !== undefined && `手机号吧、：${data.tel === 'true' ? '已绑定' : '未绑定'}`,
          data.wx !== undefined && `微信：${data.wx === 'true' ? '已绑定' : '未绑定'}`,
          data.zfb !== undefined && `支付宝：${data.zfb === 'true' ? '已绑定' : '未绑定'}`,
          data.shiming !== undefined && `实名认证：${data.shiming === 'true' ? '已绑定' : '未绑定'}`,
          `--- 活跃信息 ---`,
          data.group_num !== undefined && `加群数：${data.group_num}`,
          data.m_send_num !== undefined && `月活数量：${data.m_send_num}`,
          data.send_num !== undefined && `累计发送：${data.send_num}`,
          data.first_send !== undefined && `首次发送：${data.first_send}`,
          data.last_send !== undefined && `最后发送：${data.last_send}`,
          `--- 云黑信息 ---`,
          `云黑状态：${data.yh === 'true' ? '是' : '账号暂无云黑'}`,
          `类型判定：${type}`,
          `原因说明：${data.note || '无记录'}`,
          `处理人员：${data.admin || '未知'}`,
          `云黑等级：${data.level || '未知'}`,
          `记录日期：${data.date || '未知'}`
        ]
        .filter(Boolean) // 过滤掉空行
        .join('\n')
      } catch (error) {
        logger.error('云黑查询过程中发生错误', { 
          ...logContext, 
          error: error.message,
          stack: error.stack 
        })
        return `查询ID ${id} 时出现未知错误，请稍后再试`
      }
    })

  logger.debug('插件配置已加载', { 
    endpoint: config.endpoint,
    rateLimit: config.rateLimit,
    apiKey: config.apiKey ? `${config.apiKey.slice(0, 2)}****${config.apiKey.slice(-2)}` : '未配置'
  })
}