# koishi-plugin-yunhei-query

[![npm](https://img.shields.io/npm/v/koishi-plugin-yunhei-query?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-yunhei-query)

# Koishi 云黑信息查询插件

🔍 一个安全高效的云黑名单查询插件，支持速率限制与详尽的错误处理机制，目前只有趣绮梦的适配。

[![koishi-plugin](https://img.shields.io/badge/Koishi-Plugin-blueviolet)](https://koishi.chat/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## 功能特性

- 🚀 实时云黑状态查询
- ⚡ 智能速率限制 (1-100次/分钟可调)
- 🔒 API 密钥加密存储
- 📊 详细的请求性能监控
- 🛡️ 敏感信息自动脱敏
- 📝 多维度日志记录
- 🧩 开箱即用的配置方案

## 安装

```bash
# 通过 npm 安装
npm i koishi-plugin-yunhei-query

# 或通过 yarn
yarn add koishi-plugin-yunhei-query
```

## 配置指南（可以通过插件管理调整）

```yaml
plugins:
  yunhei-api:
    # 必填项：从服务商获取的API密钥
    apiKey: your_api_key_here
    
    # 选填：API端点地址 (默认值如下)
    endpoint: https://api.example.com/yunhei
    
    # 选填：每分钟请求上限 (默认30次)
    rateLimit: 30
```

## 使用说明

### 基础查询
```bash
yunhei <QQID>
示例：yunhei 123456789
```

### 查询结果示例
```text
=== 云黑查询结果 ===
云黑状态：已记录
类型判定：yunhei
原因说明：流模换模
处理人员：幻梦
记录日期：2023-08-20
```

### 错误处理
- 触发频率限制时返回友好提示
- 网络错误自动重试
- 异常响应结构化处理

## 开发者注意事项

### 安全规范
1. API密钥在日志中显示为前2位 + **** + 后2位格式
2. 超过20字符的查询ID自动模糊处理
3. 使用 HTTPS 加密传输

### 性能指标
- 默认5秒请求超时
- 记录每个请求的响应时间
- 自动清理过期的速率限制记录

### 日志级别
| 级别   | 触发场景                     |
|--------|----------------------------|
| DEBUG  | 请求启动/配置加载           |
| INFO   | 成功请求统计                |
| WARN   | 频率限制触发                |
| ERROR  | API错误/数据格式异常        |

## 常见问题解答

### Q1: 如何获取 API 密钥？
请联系您的云黑服务提供商获取有效密钥，
如趣绮梦，申请key请联系QQ1137889900 我们不会收取您任何费用!

### Q2: 出现"响应结构异常"错误怎么办？
请确认：
1. 服务端返回的 JSON 格式符合接口规范
2. info 数组包含至少一个有效对象
3. 必要字段存在且类型正确

### Q3: 如何调整频率限制？
在配置中修改 rateLimit 值，或者在koishi插件管理移动滑条后，重载插件。


## 贡献指南

欢迎提交 PR 优化以下方面：
- 改进错误处理逻辑
- 添加单元测试用例
- 多语言支持

## 许可证

MIT License © 2023 lanyu-cn & feng11z                          








