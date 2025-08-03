# NewAPI Stats

一个用于监控 NewAPI/OneAPI 站点使用量的 VS Code 扩展，支持实时显示余额、消耗和使用统计。

## 功能特性

- 🔍 **实时监控**: 显示账户余额、今日消耗、总消耗等统计信息
- 💰 **多货币支持**: 支持 USD 和 CNY 双货币显示
- 📊 **使用率分析**: 可视化使用百分比和进度条
- 🔄 **自动刷新**: 可配置的自动刷新间隔
- 🎯 **精准计算**: 基于 NewAPI 官方转换公式的准确计算
- 🛡️ **安全存储**: 敏感信息安全存储在 VS Code 密钥库中

## 支持的站点

所有基于 [OneAPI](https://github.com/songquanpeng/one-api) 和 [NewAPI](https://github.com/QuantumNous/new-api) 部署的 AI 中转站点，包括但不限于：

- instcopilot-api.com
- 其他使用相同 API 格式的站点

## 安装配置

### 1. 安装扩展

从 VS Code 扩展市场搜索 "NewAPI Stats" 并安装。

### 2. 初始配置

首次使用会弹出设置向导，按步骤配置：

1. **站点地址**: 输入你的 NewAPI 站点 URL（如：`https://instcopilot-api.com`）
2. **用户 ID**: 在站点的用户信息页面找到你的用户 ID
3. **Session Cookie**: 从浏览器开发者工具中复制 session cookie 值

### 3. 获取 Session Cookie

1. 登录到你的 NewAPI 站点
2. 按 F12 打开开发者工具
3. 切换到 "Application" 或 "存储" 标签
4. 在 "Cookies" 中找到你的站点
5. 复制 `session` 字段的值

## 显示界面

### 侧边栏视图
```
📊 NewAPI 使用统计
├── 💰 余额: $2.85 (1,422,586 tokens)
├── 📅 今日消耗: $1.21 (602,835 tokens)  
├── 📈 总消耗: $2.15 (1,077,414 tokens)
├── 💎 总金额: $5.00 (余额+总消耗)
├── 📊 使用率: 43.0% ████████░░
├── 🔢 今日请求: 117次
├── 🔢 总请求: 174次
├── 📝 今日 Tokens: 提示: 650 | 完成: 41,181
└── ⏰ 更新时间: 14:30:25
```

### 状态栏显示
`💰 $2.85 | 📊 43.0% | 🔄 14:30`

## 可用命令

- `NewAPI: 刷新数据` - 手动刷新统计数据
- `NewAPI: 设置` - 打开设置菜单
- `NewAPI: 重置所有配置` - 重置所有配置（需确认）

## 配置选项

在 VS Code 设置中搜索 "newapi-stats" 可以找到以下配置项：

- `newapi-stats.baseUrl`: NewAPI 站点地址
- `newapi-stats.userId`: 用户 ID
- `newapi-stats.refreshInterval`: 自动刷新间隔（秒）
- `newapi-stats.conversionFactor`: Token 到 USD 转换因子（默认：500000）
- `newapi-stats.exchangeRate`: USD 到 CNY 汇率（默认：7.2）

## 隐私安全

- Session Cookie 等敏感信息安全存储在 VS Code 的密钥库中
- 不会向第三方发送任何数据
- 所有请求直接发送到你配置的 NewAPI 站点

## 故障排除

### 常见问题

1. **获取数据失败**: 
   - 检查站点地址是否正确
   - 确认用户 ID 是否正确
   - 重新获取 Session Cookie（可能已过期）

2. **认证失败**:
   - Session Cookie 可能已过期，需要重新登录站点并获取新的 cookie

3. **数据显示不准确**:
   - 检查转换因子和汇率设置是否正确
   - 可以在设置中调整这些参数

### 获取支持

如果遇到问题，请：

1. 检查 VS Code 的输出面板是否有错误信息
2. 在项目 GitHub 页面提交 Issue
3. 包含错误信息和配置（隐去敏感信息）

## 更新日志

### v0.1.0
- 初始版本发布
- 支持基础的余额和消耗统计
- 支持自动刷新和状态栏显示

## 开发

本项目基于 TypeScript 开发，使用 VS Code 扩展 API。

### 本地开发

```bash
# 克隆项目
git clone https://github.com/newapi-stats/newapi-stats.git

# 安装依赖
npm install

# 编译
npm run compile

# 在 VS Code 中按 F5 启动调试
```

## 许可证

MIT License

## 致谢

- 感谢 [OneAPI](https://github.com/songquanpeng/one-api) 和 [NewAPI](https://github.com/QuantumNous/new-api) 项目
- 基于 [yesCode Stats](https://github.com/StevenQi7/yesCode-Stats) 进行扩展