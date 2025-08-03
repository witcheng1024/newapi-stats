import * as vscode from 'vscode';
import { StatsProvider } from './providers/statsProvider';
import { NewAPIService } from './services/apiService';
import { StatusBarManager } from './ui/statusBarManager';

let statusBarManager: StatusBarManager | undefined;
let refreshInterval: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext) {
    console.log('NewAPI 使用统计插件已激活！');

    const apiService = new NewAPIService(context);
    const statsProvider = new StatsProvider(apiService);
    statusBarManager = new StatusBarManager();

    const treeView = vscode.window.createTreeView('newapiStats', {
        treeDataProvider: statsProvider,
        showCollapseAll: false
    });

    context.subscriptions.push(treeView);

    // 注册命令
    const refreshCommand = vscode.commands.registerCommand('newapi-stats.refresh', async () => {
        await refreshStats(apiService, statsProvider, statusBarManager);
    });

    const resetAllCommand = vscode.commands.registerCommand('newapi-stats.resetAll', async () => {
        const confirm = await vscode.window.showWarningMessage(
            '确定要重置所有配置吗？这将清除所有设置和敏感信息。',
            '确定重置',
            '取消'
        );
        
        if (confirm === '确定重置') {
            // 清除密钥库中的敏感信息
            await context.secrets.delete('newapi-stats.sessionCookie');
            
            // 清除已看过设置的标记
            await context.globalState.update('newapi-stats.hasSeenSetup', undefined);
            
            // 重置配置到默认值
            const config = vscode.workspace.getConfiguration('newapi-stats');
            await config.update('baseUrl', undefined, true);
            await config.update('userId', undefined, true);
            await config.update('conversionFactor', undefined, true);
            await config.update('exchangeRate', undefined, true);
            await config.update('refreshInterval', undefined, true);
            
            // 清空状态栏和树视图
            statusBarManager?.clear();
            statsProvider.clear();
            
            vscode.window.showInformationMessage('所有配置已重置！将重新载入窗口以应用更改...');
            
            // 重新载入窗口
            setTimeout(() => {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }, 1000);
        }
    });

    const configureCommand = vscode.commands.registerCommand('newapi-stats.configure', async () => {
        const options = [
            '设置站点地址',
            '设置用户 ID', 
            '设置 Session Cookie',
            '设置刷新周期',
            '设置转换参数',
            '快速设置向导'
        ];
        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: '请选择要配置的选项'
        });

        const config = vscode.workspace.getConfiguration('newapi-stats');

        switch (selected) {
            case '设置站点地址':
                const baseUrl = await vscode.window.showInputBox({
                    prompt: '请输入 NewAPI 站点地址',
                    placeHolder: 'https://your-newapi-site.com',
                    value: config.get<string>('baseUrl', ''),
                    validateInput: (value) => {
                        if (!value || !value.startsWith('http')) {
                            return '请输入有效的 URL 地址';
                        }
                        return null;
                    }
                });

                if (baseUrl) {
                    await config.update('baseUrl', baseUrl, true);
                    vscode.window.showInformationMessage('站点地址更新成功！');
                }
                break;

            case '设置用户 ID':
                const userId = await vscode.window.showInputBox({
                    prompt: '请输入用户 ID（可在站点的用户信息页面找到）',
                    placeHolder: '例如: 1234',
                    value: config.get<number>('userId', 0).toString(),
                    validateInput: (value) => {
                        const num = parseInt(value);
                        if (isNaN(num) || num <= 0) {
                            return '请输入一个有效的用户 ID';
                        }
                        return null;
                    }
                });

                if (userId) {
                    await config.update('userId', parseInt(userId), true);
                    vscode.window.showInformationMessage('用户 ID 更新成功！');
                }
                break;

            case '设置 Session Cookie':
                const currentCookie = await context.secrets.get('newapi-stats.sessionCookie') || '';
                const sessionCookie = await vscode.window.showInputBox({
                    prompt: '请输入 Session Cookie（从浏览器开发者工具中复制）',
                    password: true,
                    placeHolder: 'MTcxxxxxxxxxxxFQVFM...',
                    value: currentCookie,
                    validateInput: (value) => {
                        if (!value || value.trim().length === 0) {
                            return '请输入 Session Cookie';
                        }
                        return null;
                    }
                });

                if (sessionCookie !== undefined) {
                    await apiService.setSessionCookie(sessionCookie);
                    vscode.window.showInformationMessage('Session Cookie 已安全保存！');
                    await refreshStats(apiService, statsProvider, statusBarManager);
                }
                break;

            case '设置刷新周期':
                const intervalOptions = [
                    { label: '30秒', value: 30 },
                    { label: '1分钟', value: 60 },
                    { label: '5分钟', value: 300 },
                    { label: '10分钟', value: 600 },
                    { label: '30分钟', value: 1800 }
                ];
                
                const selectedInterval = await vscode.window.showQuickPick(intervalOptions, {
                    placeHolder: '请选择刷新周期'
                });

                if (selectedInterval) {
                    await config.update('refreshInterval', selectedInterval.value, true);
                    vscode.window.showInformationMessage(`刷新周期已设置为 ${selectedInterval.label}`);
                    startAutoRefresh(apiService, statsProvider, statusBarManager);
                }
                break;

            case '设置转换参数':
                const conversionFactor = await vscode.window.showInputBox({
                    prompt: '请输入 Token 到 USD 转换因子',
                    placeHolder: '500000',
                    value: config.get<number>('conversionFactor', 500000).toString(),
                    validateInput: (value) => {
                        const num = parseFloat(value);
                        if (isNaN(num) || num <= 0) {
                            return '请输入一个大于0的数字';
                        }
                        return null;
                    }
                });

                if (conversionFactor) {
                    await config.update('conversionFactor', parseFloat(conversionFactor), true);
                    
                    const exchangeRate = await vscode.window.showInputBox({
                        prompt: '请输入 USD 到 CNY 汇率',
                        placeHolder: '7.2',
                        value: config.get<number>('exchangeRate', 7.2).toString(),
                        validateInput: (value) => {
                            const num = parseFloat(value);
                            if (isNaN(num) || num <= 0) {
                                return '请输入一个大于0的数字';
                            }
                            return null;
                        }
                    });

                    if (exchangeRate) {
                        await config.update('exchangeRate', parseFloat(exchangeRate), true);
                        vscode.window.showInformationMessage('转换参数更新成功！');
                        await refreshStats(apiService, statsProvider, statusBarManager);
                    }
                }
                break;

            case '快速设置向导':
                await runSetupWizard(context, apiService, statsProvider, statusBarManager);
                break;
        }
    });

    context.subscriptions.push(refreshCommand);
    context.subscriptions.push(resetAllCommand);
    context.subscriptions.push(configureCommand);
    context.subscriptions.push(statusBarManager);

    // 等待配置加载完成
    await apiService.loadConfig();
    
    // 检查是否需要初始设置
    const needsSetup = await checkInitialSetup(context, apiService);
    if (needsSetup) {
        await runInitialSetup(context, apiService, statsProvider, statusBarManager);
    } else {
        await refreshStats(apiService, statsProvider, statusBarManager);
        startAutoRefresh(apiService, statsProvider, statusBarManager);
    }

    context.subscriptions.push({
        dispose: () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        }
    });
}

async function refreshStats(
    apiService: NewAPIService, 
    statsProvider: StatsProvider, 
    statusBarManager: StatusBarManager | undefined
) {
    try {
        statusBarManager?.showLoading();
        const stats = await apiService.fetchStats();
        if (stats) {
            statsProvider.refresh(stats);
            statusBarManager?.update(stats);
        } else {
            statsProvider.clear();
            statusBarManager?.clear();
        }
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`获取数据失败: ${error.message}`);
            statusBarManager?.showError(error.message);
        }
    }
}

function startAutoRefresh(
    apiService: NewAPIService, 
    statsProvider: StatsProvider, 
    statusBarManager: StatusBarManager | undefined
) {
    const config = vscode.workspace.getConfiguration('newapi-stats');
    const interval = config.get<number>('refreshInterval', 300) * 1000;

    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    refreshInterval = setInterval(() => {
        refreshStats(apiService, statsProvider, statusBarManager);
    }, interval);
}

async function checkInitialSetup(context: vscode.ExtensionContext, apiService: NewAPIService): Promise<boolean> {
    const hasSeenSetup = context.globalState.get<boolean>('newapi-stats.hasSeenSetup', false);
    const isConfigured = apiService.isConfigured();
    
    // 如果没有配置且没有看过设置引导，则需要初始设置
    return !isConfigured && !hasSeenSetup;
}

async function runInitialSetup(
    context: vscode.ExtensionContext, 
    apiService: NewAPIService, 
    statsProvider: StatsProvider, 
    statusBarManager: StatusBarManager | undefined
) {
    const setupResult = await vscode.window.showInformationMessage(
        '欢迎使用 NewAPI 使用统计插件！需要进行初始设置。',
        '开始设置',
        '稍后设置'
    );
    
    if (setupResult !== '开始设置') {
        await context.globalState.update('newapi-stats.hasSeenSetup', true);
        vscode.window.showInformationMessage('你可以稍后通过点击侧边栏的设置按钮进行配置。');
        return;
    }
    
    await runSetupWizard(context, apiService, statsProvider, statusBarManager);
}

async function runSetupWizard(
    context: vscode.ExtensionContext, 
    apiService: NewAPIService, 
    statsProvider: StatsProvider, 
    statusBarManager: StatusBarManager | undefined
) {
    // 步骤1: 设置站点地址
    const baseUrl = await vscode.window.showInputBox({
        prompt: '步骤 1/3: 请输入 NewAPI 站点地址',
        placeHolder: 'https://your-newapi-site.com',
        value: '',
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || !value.startsWith('http')) {
                return '请输入有效的 URL 地址';
            }
            return null;
        }
    });
    
    if (!baseUrl) {
        vscode.window.showWarningMessage('设置已取消。');
        return;
    }
    
    // 步骤2: 设置用户ID
    const userId = await vscode.window.showInputBox({
        prompt: '步骤 2/3: 请输入用户 ID（可在站点的用户信息页面找到）',
        placeHolder: '例如: 1234',
        ignoreFocusOut: true,
        validateInput: (value) => {
            const num = parseInt(value);
            if (isNaN(num) || num <= 0) {
                return '请输入一个有效的用户 ID';
            }
            return null;
        }
    });
    
    if (!userId) {
        vscode.window.showWarningMessage('设置已取消。');
        return;
    }
    
    // 步骤3: 设置Session Cookie
    const sessionCookie = await vscode.window.showInputBox({
        prompt: '步骤 3/3: 请输入 Session Cookie（从浏览器开发者工具中复制）',
        password: true,
        placeHolder: 'MTcxxxxxxxxxxxFQVFM...',
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return '请输入 Session Cookie';
            }
            return null;
        }
    });
    
    if (!sessionCookie) {
        vscode.window.showWarningMessage('设置已取消。');
        return;
    }
    
    // 保存配置
    await apiService.setConfig({
        baseUrl,
        userId: parseInt(userId),
        sessionCookie
    });
    
    vscode.window.showInformationMessage('设置完成！开始获取使用统计数据...');
    
    // 标记为已完成设置
    await context.globalState.update('newapi-stats.hasSeenSetup', true);
    
    // 设置完成后刷新数据
    await refreshStats(apiService, statsProvider, statusBarManager);
    startAutoRefresh(apiService, statsProvider, statusBarManager);
}

export function deactivate() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}