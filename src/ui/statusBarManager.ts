import * as vscode from 'vscode';
import { Stats } from '../models/stats';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'newapi-stats.refresh';
        this.statusBarItem.show();
    }

    update(stats: Stats): void {
        const balanceText = `💰 $${stats.balanceUSD.toFixed(2)}`;
        const usageText = `📊 ${stats.usagePercentage.toFixed(1)}%`;
        const timeText = `🔄 ${stats.lastUpdated.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })}`;
        
        this.statusBarItem.text = `${balanceText} | ${usageText} | ${timeText}`;
        this.statusBarItem.tooltip = this.createTooltip(stats);
    }

    private createTooltip(stats: Stats): string {
        return [
            `NewAPI 使用统计`,
            ``,
            `💰 余额: $${stats.balanceUSD.toFixed(2)} (${stats.balance.toLocaleString()} tokens)`,
            `📅 今日消耗: $${stats.todayConsumptionUSD.toFixed(2)} (${stats.todayConsumption.toLocaleString()} tokens)`,
            `📈 总消耗: $${stats.totalConsumptionUSD.toFixed(2)} (${stats.totalConsumption.toLocaleString()} tokens)`,
            `💎 总金额: $${stats.totalAmountUSD.toFixed(2)}`,
            `📊 使用率: ${stats.usagePercentage.toFixed(1)}%`,
            `🔢 今日请求: ${stats.todayRequests.toLocaleString()} 次`,
            `🔢 总请求: ${stats.totalRequests.toLocaleString()} 次`,
            ``,
            `⏰ 更新时间: ${stats.lastUpdated.toLocaleString('zh-CN')}`,
            ``,
            `点击刷新数据`
        ].join('\n');
    }

    clear(): void {
        this.statusBarItem.text = '$(loading~spin) NewAPI Stats';
        this.statusBarItem.tooltip = 'NewAPI 使用统计 - 点击刷新';
    }

    showError(message: string): void {
        this.statusBarItem.text = '$(error) NewAPI Stats';
        this.statusBarItem.tooltip = `NewAPI 使用统计 - 错误: ${message}`;
    }

    showLoading(): void {
        this.statusBarItem.text = '$(loading~spin) 获取数据中...';
        this.statusBarItem.tooltip = 'NewAPI 使用统计 - 正在获取数据...';
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}