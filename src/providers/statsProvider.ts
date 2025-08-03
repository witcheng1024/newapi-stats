import * as vscode from 'vscode';
import { NewAPIService } from '../services/apiService';
import { Stats } from '../models/stats';

export class StatsProvider implements vscode.TreeDataProvider<StatsItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<StatsItem | undefined | null | void> = new vscode.EventEmitter<StatsItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StatsItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private stats: Stats | null = null;

    constructor(private apiService: NewAPIService) {}

    refresh(stats: Stats): void {
        this.stats = stats;
        this._onDidChangeTreeData.fire();
    }

    clear(): void {
        this.stats = null;
        this._onDidChangeTreeData.fire();
    }

    private getProgressBar(percentage: number): string {
        const width = 10;
        const filled = Math.round((percentage / 100) * width);
        const empty = width - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    private formatNumber(num: number): string {
        return num.toLocaleString();
    }

    private formatCurrency(amount: number, currency: 'USD' | 'CNY'): string {
        if (currency === 'USD') {
            return `$${amount.toFixed(2)}`;
        } else {
            return `¥${amount.toFixed(2)}`;
        }
    }

    getTreeItem(element: StatsItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: StatsItem): Thenable<StatsItem[]> {
        if (!this.stats) {
            if (!this.apiService.isConfigured()) {
                return Promise.resolve([
                    new StatsItem('未配置', '请点击设置按钮配置 NewAPI 信息', vscode.TreeItemCollapsibleState.None, 'warning')
                ]);
            } else {
                return Promise.resolve([
                    new StatsItem('暂无数据', '请点击刷新按钮获取数据', vscode.TreeItemCollapsibleState.None, 'info')
                ]);
            }
        }

        if (!element) {
            return Promise.resolve([
                // 余额信息
                new StatsItem(
                    '💰 余额',
                    `${this.formatCurrency(this.stats.balanceUSD, 'USD')} (${this.formatNumber(this.stats.balance)} tokens)`,
                    vscode.TreeItemCollapsibleState.None,
                    'account'
                ),
                
                // 今日消耗
                new StatsItem(
                    '📅 今日消耗',
                    `${this.formatCurrency(this.stats.todayConsumptionUSD, 'USD')} (${this.formatNumber(this.stats.todayConsumption)} tokens)`,
                    vscode.TreeItemCollapsibleState.None,
                    'calendar'
                ),
                
                // 总消耗
                new StatsItem(
                    '📈 总消耗',
                    `${this.formatCurrency(this.stats.totalConsumptionUSD, 'USD')} (${this.formatNumber(this.stats.totalConsumption)} tokens)`,
                    vscode.TreeItemCollapsibleState.None,
                    'graph'
                ),
                
                // 总金额
                new StatsItem(
                    '💎 总金额',
                    `${this.formatCurrency(this.stats.totalAmountUSD, 'USD')} (余额+总消耗)`,
                    vscode.TreeItemCollapsibleState.None,
                    'diamond'
                ),
                
                // 剩余率
                new StatsItem(
                    '📊 剩余率',
                    `${this.stats.remainingPercentage.toFixed(1)}% ${this.getProgressBar(this.stats.remainingPercentage)}`,
                    vscode.TreeItemCollapsibleState.None,
                    'graph-line'
                ),
                
                // 今日请求
                new StatsItem(
                    '🔢 今日请求',
                    `${this.formatNumber(this.stats.todayRequests)} 次`,
                    vscode.TreeItemCollapsibleState.None,
                    'pulse'
                ),
                
                // 总请求
                new StatsItem(
                    '🔢 总请求',
                    `${this.formatNumber(this.stats.totalRequests)} 次`,
                    vscode.TreeItemCollapsibleState.None,
                    'timeline'
                ),
                
                // Token 统计
                new StatsItem(
                    '📝 今日 Tokens',
                    `提示: ${this.formatNumber(this.stats.todayPromptTokens)} | 完成: ${this.formatNumber(this.stats.todayCompletionTokens)}`,
                    vscode.TreeItemCollapsibleState.None,
                    'symbol-text'
                ),
                
                // 更新时间
                new StatsItem(
                    '⏰ 更新时间',
                    this.stats.lastUpdated.toLocaleTimeString('zh-CN'),
                    vscode.TreeItemCollapsibleState.None,
                    'clock'
                )
            ]);
        }

        return Promise.resolve([]);
    }
}

class StatsItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private value: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        private icon: string
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}: ${this.value}`;
        this.description = this.value;
        this.iconPath = new vscode.ThemeIcon(this.icon);
        
        // 根据剩余率设置不同颜色
        if (this.label.includes('剩余率')) {
            const remaining = parseFloat(this.value);
            if (remaining < 10) {
                this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('editorError.foreground'));
            } else if (remaining < 20) {
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
            } else {
                this.iconPath = new vscode.ThemeIcon('graph-line', new vscode.ThemeColor('charts.green'));
            }
        }
        
        // 余额和消耗的特殊颜色
        if (this.label.includes('余额')) {
            this.iconPath = new vscode.ThemeIcon(this.icon, new vscode.ThemeColor('charts.blue'));
        } else if (this.label.includes('消耗')) {
            this.iconPath = new vscode.ThemeIcon(this.icon, new vscode.ThemeColor('charts.orange'));
        } else if (this.label.includes('总金额')) {
            this.iconPath = new vscode.ThemeIcon(this.icon, new vscode.ThemeColor('charts.purple'));
        }
    }
}