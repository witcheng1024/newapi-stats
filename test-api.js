// 简单的测试文件，用于验证 NewAPI 服务
// 在实际的 VS Code 环境中运行

import { NewAPIService } from './src/services/apiService';

// 模拟 VS Code 上下文（仅用于测试）
const mockContext = {
    secrets: {
        get: async (key: string) => {
            // 返回测试用的 session cookie（请替换为你的实际cookie）
            if (key === 'newapi-stats.sessionCookie') {
                return 'your_session_cookie_here';
            }
            return '';
        },
        store: async (key: string, value: string) => {
            console.log(`存储密钥: ${key}`);
        }
    },
    globalState: {
        get: (key: string, defaultValue: any) => defaultValue,
        update: async (key: string, value: any) => {
            console.log(`更新状态: ${key} = ${value}`);
        }
    }
} as any;

// 模拟 vscode.workspace.getConfiguration
const mockConfig = {
    get: (key: string, defaultValue: any) => {
        const configs: any = {
            'baseUrl': 'https://your-newapi-site.com',
            'userId': 0,
            'conversionFactor': 500000,
            'exchangeRate': 7.2,
            'refreshInterval': 300
        };
        return configs[key] || defaultValue;
    },
    update: async (key: string, value: any, global: boolean) => {
        console.log(`更新配置: ${key} = ${value} (global: ${global})`);
    }
};

// 模拟 vscode.workspace
global.vscode = {
    workspace: {
        getConfiguration: () => mockConfig,
        onDidChangeConfiguration: () => ({ dispose: () => {} })
    }
} as any;

async function testNewAPIService() {
    console.log('🚀 开始测试 NewAPI 服务...\n');
    
    try {
        // 创建服务实例
        const apiService = new NewAPIService(mockContext);
        
        // 加载配置
        await apiService.loadConfig();
        console.log('✅ 配置加载成功');
        
        // 检查配置状态
        const isConfigured = apiService.isConfigured();
        console.log(`📝 配置状态: ${isConfigured ? '已配置' : '未配置'}`);
        
        if (isConfigured) {
            console.log('\n🔄 开始获取统计数据...');
            
            // 获取统计数据
            const stats = await apiService.fetchStats();
            
            if (stats) {
                console.log('\n📊 统计数据获取成功:');
                console.log(`💰 余额: ${stats.balance.toLocaleString()} tokens (${stats.balanceUSD.toFixed(2)} USD)`);
                console.log(`📅 今日消耗: ${stats.todayConsumption.toLocaleString()} tokens (${stats.todayConsumptionUSD.toFixed(2)} USD)`);
                console.log(`📈 总消耗: ${stats.totalConsumption.toLocaleString()} tokens (${stats.totalConsumptionUSD.toFixed(2)} USD)`);
                console.log(`💎 总金额: ${stats.totalAmountUSD.toFixed(2)} USD`);
                console.log(`📊 使用率: ${stats.usagePercentage.toFixed(1)}%`);
                console.log(`🔢 今日请求: ${stats.todayRequests.toLocaleString()} 次`);
                console.log(`🔢 总请求: ${stats.totalRequests.toLocaleString()} 次`);
                console.log(`⏰ 更新时间: ${stats.lastUpdated.toLocaleString()}`);
            } else {
                console.log('❌ 未获取到统计数据');
            }
        } else {
            console.log('⚠️ 服务未配置，请先设置必要的参数');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

// 导出测试函数
export { testNewAPIService };

// 如果直接运行此文件
if (require.main === module) {
    testNewAPIService();
}