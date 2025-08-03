import * as vscode from 'vscode';
import * as https from 'https';
import { 
    NewAPIResponse, 
    UserInfo, 
    AccountData, 
    Stats, 
    NewAPIConfig,
    TodayUsageData,
    TotalUsageData,
    LogResponseData,
    LogItem
} from '../models/stats';

export class NewAPIService {
    private config: NewAPIConfig;
    private context: vscode.ExtensionContext;
    private accessToken: string = '';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.config = {
            baseUrl: '',
            userId: 0,
            sessionCookie: '',
            conversionFactor: 500000,
            exchangeRate: 7.2
        };
        this.loadConfig();
        
        // 监听配置变化
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('newapi-stats')) {
                this.loadConfig();
            }
        });
    }

    async loadConfig(): Promise<void> {
        const config = vscode.workspace.getConfiguration('newapi-stats');
        
        this.config.baseUrl = config.get<string>('baseUrl', 'https://instcopilot-api.com');
        this.config.userId = config.get<number>('userId', 0);
        this.config.conversionFactor = config.get<number>('conversionFactor', 500000);
        this.config.exchangeRate = config.get<number>('exchangeRate', 7.2);
        
        // 从密钥库读取敏感信息
        this.config.sessionCookie = await this.context.secrets.get('newapi-stats.sessionCookie') || '';
    }

    async setSessionCookie(sessionCookie: string): Promise<void> {
        await this.context.secrets.store('newapi-stats.sessionCookie', sessionCookie);
        this.config.sessionCookie = sessionCookie;
    }

    async setConfig(config: Partial<NewAPIConfig>): Promise<void> {
        const vsConfig = vscode.workspace.getConfiguration('newapi-stats');
        
        if (config.baseUrl !== undefined) {
            await vsConfig.update('baseUrl', config.baseUrl, true);
            this.config.baseUrl = config.baseUrl;
        }
        
        if (config.userId !== undefined) {
            await vsConfig.update('userId', config.userId, true);
            this.config.userId = config.userId;
        }
        
        if (config.sessionCookie !== undefined) {
            await this.setSessionCookie(config.sessionCookie);
        }
        
        if (config.conversionFactor !== undefined) {
            await vsConfig.update('conversionFactor', config.conversionFactor, true);
            this.config.conversionFactor = config.conversionFactor;
        }
        
        if (config.exchangeRate !== undefined) {
            await vsConfig.update('exchangeRate', config.exchangeRate, true);
            this.config.exchangeRate = config.exchangeRate;
        }
    }

    private makeHttpsRequest(url: string, headers: Record<string, string>): Promise<any> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Pragma': 'no-cache',
                    ...headers
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const jsonData = JSON.parse(data);
                            resolve(jsonData);
                        } catch (error) {
                            reject(new Error('解析响应数据失败'));
                        }
                    } else if (res.statusCode === 401) {
                        reject(new Error('认证失败，请检查配置'));
                    } else if (res.statusCode === 404) {
                        reject(new Error('API 地址不存在'));
                    } else {
                        reject(new Error(`API 请求失败: 状态码 ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`网络请求失败: ${error.message}`));
            });

            req.end();
        });
    }

    private createCookieAuthHeaders(): Record<string, string> {
        return {
            'New-API-User': this.config.userId.toString(),
            'Cookie': `session=${this.config.sessionCookie}`
        };
    }

    private createTokenAuthHeaders(): Record<string, string> {
        return {
            'New-API-User': this.config.userId.toString(),
            'Authorization': `Bearer ${this.accessToken}`,
            'Cookie': '' // 使用token时清空Cookie
        };
    }

    private async fetchUserInfo(): Promise<UserInfo> {
        const url = `${this.config.baseUrl}/api/user/self`;
        const headers = this.createCookieAuthHeaders();
        
        const response = await this.makeHttpsRequest(url, headers) as NewAPIResponse<UserInfo>;
        
        if (!response.success || !response.data) {
            throw new Error(response.message || '获取用户信息失败');
        }
        
        return response.data;
    }

    private async getOrCreateAccessToken(): Promise<string> {
        const userInfo = await this.fetchUserInfo();
        
        if (userInfo.access_token) {
            return userInfo.access_token;
        }
        
        // 如果没有access_token，尝试创建一个
        const url = `${this.config.baseUrl}/api/user/token`;
        const headers = this.createCookieAuthHeaders();
        
        const response = await this.makeHttpsRequest(url, headers) as NewAPIResponse<string>;
        
        if (!response.success || !response.data) {
            throw new Error(response.message || '创建访问令牌失败');
        }
        
        return response.data;
    }

    private async fetchBalance(): Promise<number> {
        if (!this.accessToken) {
            this.accessToken = await this.getOrCreateAccessToken();
        }
        
        const url = `${this.config.baseUrl}/api/user/self`;
        const headers = this.createTokenAuthHeaders();
        
        const response = await this.makeHttpsRequest(url, headers) as NewAPIResponse<{quota?: number}>;
        
        if (!response.success || response.data === undefined) {
            throw new Error(response.message || '获取余额失败');
        }
        
        return response.data.quota || 0;
    }

    private getTodayTimestampRange(): { start: number; end: number } {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = Math.floor(today.getTime() / 1000);
        
        today.setHours(23, 59, 59, 999);
        const end = Math.floor(today.getTime() / 1000);
        
        return { start, end };
    }

    private async fetchUsageData(startTimestamp?: number, endTimestamp?: number): Promise<{consumption: number, requests: number, promptTokens: number, completionTokens: number}> {
        if (!this.accessToken) {
            this.accessToken = await this.getOrCreateAccessToken();
        }
        
        let currentPage = 1;
        const maxPages = 50; // 限制最大页数
        const pageSize = 100;
        let totalConsumption = 0;
        let totalRequests = 0;
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;
        
        while (currentPage <= maxPages) {
            const params = new URLSearchParams({
                p: currentPage.toString(),
                page_size: pageSize.toString(),
                type: '0',
                token_name: '',
                model_name: '',
                group: ''
            });
            
            if (startTimestamp !== undefined && endTimestamp !== undefined) {
                params.append('start_timestamp', startTimestamp.toString());
                params.append('end_timestamp', endTimestamp.toString());
            }
            
            const url = `${this.config.baseUrl}/api/log/self?${params.toString()}`;
            const headers = this.createTokenAuthHeaders();
            
            const response = await this.makeHttpsRequest(url, headers) as NewAPIResponse<LogResponseData>;
            
            if (!response.success || !response.data) {
                throw new Error(response.message || '获取使用记录失败');
            }
            
            const items = response.data.items || [];
            const currentPageItemCount = items.length;
            
            // 聚合当前页数据
            for (const item of items) {
                totalConsumption += item.quota || 0;
                totalPromptTokens += item.prompt_tokens || 0;
                totalCompletionTokens += item.completion_tokens || 0;
            }
            
            totalRequests += currentPageItemCount;
            
            // 检查是否还有更多数据
            const total = response.data.total || 0;
            const totalPages = Math.ceil(total / pageSize);
            if (currentPage >= totalPages || currentPageItemCount === 0) {
                break;
            }
            
            currentPage++;
        }
        
        return {
            consumption: totalConsumption,
            requests: totalRequests,
            promptTokens: totalPromptTokens,
            completionTokens: totalCompletionTokens
        };
    }

    private async fetchTodayUsage(): Promise<TodayUsageData> {
        const { start, end } = this.getTodayTimestampRange();
        const usage = await this.fetchUsageData(start, end);
        
        return {
            quota_consumption: usage.consumption,
            prompt_tokens: usage.promptTokens,
            completion_tokens: usage.completionTokens,
            requests_count: usage.requests,
            today_quota_consumption: usage.consumption,
            today_prompt_tokens: usage.promptTokens,
            today_completion_tokens: usage.completionTokens,
            today_requests_count: usage.requests
        };
    }

    private async fetchTotalUsage(): Promise<TotalUsageData> {
        const usage = await this.fetchUsageData(); // 不设置时间戳获取全部数据
        
        return {
            quota_consumption: usage.consumption,
            prompt_tokens: usage.promptTokens,
            completion_tokens: usage.completionTokens,
            requests_count: usage.requests,
            total_quota_consumption: usage.consumption,
            total_prompt_tokens: usage.promptTokens,
            total_completion_tokens: usage.completionTokens,
            total_requests_count: usage.requests
        };
    }

    private convertTokensToUSD(tokens: number): number {
        return Math.round((tokens / this.config.conversionFactor) * 100) / 100;
    }

    private convertTokensToCNY(tokens: number): number {
        const usd = tokens / this.config.conversionFactor;
        return Math.round((usd * this.config.exchangeRate) * 100) / 100;
    }

    private calculateUsagePercentage(consumed: number, total: number): number {
        if (total <= 0) return 0;
        return Math.min(100, Math.max(0, (consumed / total) * 100));
    }

    private calculateRemainingPercentage(balance: number, total: number): number {
        if (total <= 0) return 0;
        return Math.min(100, Math.max(0, (balance / total) * 100));
    }

    async fetchStats(): Promise<Stats | null> {
        if (!this.config.baseUrl || !this.config.userId || !this.config.sessionCookie) {
            return null;
        }

        try {
            // 获取余额
            const balance = await this.fetchBalance();
            
            // 获取今日使用量
            const todayUsage = await this.fetchTodayUsage();
            
            // 获取总使用量
            const totalUsage = await this.fetchTotalUsage();
            
            // 计算USD和CNY值
            const balanceUSD = this.convertTokensToUSD(balance);
            const todayConsumptionUSD = this.convertTokensToUSD(todayUsage.today_quota_consumption);
            const totalConsumptionUSD = this.convertTokensToUSD(totalUsage.total_quota_consumption);
            const totalAmountUSD = balanceUSD + totalConsumptionUSD;
            
            const balanceCNY = this.convertTokensToCNY(balance);
            const todayConsumptionCNY = this.convertTokensToCNY(todayUsage.today_quota_consumption);
            const totalConsumptionCNY = this.convertTokensToCNY(totalUsage.total_quota_consumption);
            const totalAmountCNY = balanceCNY + totalConsumptionCNY;
            
            // 计算使用百分比和剩余百分比
            const totalAmount = balance + totalUsage.total_quota_consumption;
            const usagePercentage = this.calculateUsagePercentage(
                totalUsage.total_quota_consumption, 
                totalAmount
            );
            
            const remainingPercentage = this.calculateRemainingPercentage(
                balance,
                totalAmount
            );
            
            const todayUsagePercentage = this.calculateUsagePercentage(
                todayUsage.today_quota_consumption,
                balance
            );

            return {
                // 原始数据
                balance,
                todayConsumption: todayUsage.today_quota_consumption,
                totalConsumption: totalUsage.total_quota_consumption,
                todayRequests: todayUsage.today_requests_count,
                totalRequests: totalUsage.total_requests_count,
                todayPromptTokens: todayUsage.today_prompt_tokens,
                todayCompletionTokens: todayUsage.today_completion_tokens,
                totalPromptTokens: totalUsage.total_prompt_tokens,
                totalCompletionTokens: totalUsage.total_completion_tokens,
                
                // 美元数据
                balanceUSD,
                todayConsumptionUSD,
                totalConsumptionUSD,
                totalAmountUSD,
                
                // 人民币数据
                balanceCNY,
                todayConsumptionCNY,
                totalConsumptionCNY,
                totalAmountCNY,
                
                // 计算字段
                usagePercentage,
                remainingPercentage,
                todayUsagePercentage,
                
                lastUpdated: new Date()
            };
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('未知错误');
        }
    }

    isConfigured(): boolean {
        return !!(this.config.baseUrl && this.config.userId && this.config.sessionCookie);
    }

    getConfig(): NewAPIConfig {
        return { ...this.config };
    }
}