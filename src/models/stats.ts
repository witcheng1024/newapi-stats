// NewAPI 响应接口
export interface NewAPIResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
}

// 用户信息接口
export interface UserInfo {
    id: number;
    username: string;
    access_token: string | null;
}

// 使用量数据接口
export interface UsageData {
    quota_consumption: number;
    prompt_tokens: number;
    completion_tokens: number;
    requests_count: number;
}

// 今日使用量数据
export interface TodayUsageData extends UsageData {
    today_quota_consumption: number;
    today_prompt_tokens: number;
    today_completion_tokens: number;
    today_requests_count: number;
}

// 总使用量数据
export interface TotalUsageData extends UsageData {
    total_quota_consumption: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_requests_count: number;
}

// 账号原始数据
export interface AccountData {
    quota: number;                      // 余额 tokens
    today_quota_consumption: number;    // 今日消耗 tokens
    total_quota_consumption: number;    // 总消耗 tokens
    today_prompt_tokens: number;        // 今日prompt tokens
    today_completion_tokens: number;    // 今日completion tokens
    today_requests_count: number;       // 今日请求数
    total_prompt_tokens: number;        // 总prompt tokens
    total_completion_tokens: number;    // 总completion tokens
    total_requests_count: number;       // 总请求数
}

// 统计数据（用于显示）
export interface Stats {
    // 原始数据 (tokens)
    balance: number;                    // 余额
    todayConsumption: number;          // 今日消耗
    totalConsumption: number;          // 总消耗
    todayRequests: number;             // 今日请求数
    totalRequests: number;             // 总请求数
    todayPromptTokens: number;         // 今日prompt tokens
    todayCompletionTokens: number;     // 今日completion tokens
    totalPromptTokens: number;         // 总prompt tokens
    totalCompletionTokens: number;     // 总completion tokens
    
    // 美元格式数据
    balanceUSD: number;                // 余额 USD
    todayConsumptionUSD: number;       // 今日消耗 USD
    totalConsumptionUSD: number;       // 总消耗 USD
    totalAmountUSD: number;            // 总金额 USD (余额+总消耗)
    
    // 人民币格式数据
    balanceCNY: number;                // 余额 CNY
    todayConsumptionCNY: number;       // 今日消耗 CNY
    totalConsumptionCNY: number;       // 总消耗 CNY
    totalAmountCNY: number;            // 总金额 CNY
    
    // 计算字段
    usagePercentage: number;           // 使用百分比 (总消耗/(余额+总消耗)*100)
    todayUsagePercentage: number;      // 今日使用百分比
    
    lastUpdated: Date;
}

// NewAPI 配置接口
export interface NewAPIConfig {
    baseUrl: string;                   // 站点地址
    userId: number;                    // 用户ID
    sessionCookie: string;             // Session Cookie
    conversionFactor: number;          // 转换因子
    exchangeRate: number;              // 汇率
}

// 日志条目接口（用于API响应）
export interface LogItem {
    quota?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    created_time?: number;
    model?: string;
}

// 日志响应数据
export interface LogResponseData {
    items: LogItem[];
    total: number;
    page?: number;
    page_size?: number;
}