'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    LinearProgress,
    Alert,
    AlertTitle,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip,
    Skeleton,
} from '@mui/material';
import {
    Refresh,
    CheckCircle,
    Warning,
    Error as ErrorIcon,
    TrendingUp,
    TrendingDown,
    Speed,
    AccountBalance,
    Timeline,
} from '@mui/icons-material';

interface AgentMonitoringData {
    timestamp: string;
    agents: {
        total: number;
        active: number;
        paused: number;
        risk: number;
    };
    delegations: {
        total: number;
        active: number;
        pending: number;
        expired: number;
        totalValueLocked: string;
    };
    system: {
        database: 'healthy' | 'degraded' | 'down';
        redis: 'healthy' | 'degraded' | 'down';
        agentService: 'healthy' | 'degraded' | 'down';
        x402Server: 'healthy' | 'degraded' | 'down';
    };
    risk: {
        circuitBroken: boolean;
        currentDrawdown: number;
        tradesLastHour: number;
        dailyVolume: string;
        openPositions: number;
    };
    recentTrades: {
        id: string;
        agentName: string;
        marketId: string;
        direction: string;
        status: string;
        timestamp: string;
    }[];
    alerts: {
        level: 'info' | 'warning' | 'error' | 'critical';
        message: string;
        timestamp: string;
    }[];
}

function StatusChip({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
    const colors = {
        healthy: 'success',
        degraded: 'warning',
        down: 'error',
    } as const;

    return (
        <Chip
            label={status.toUpperCase()}
            color={colors[status]}
            size="small"
            icon={status === 'healthy' ? <CheckCircle /> : status === 'degraded' ? <Warning /> : <ErrorIcon />}
        />
    );
}

function MetricCard({
    title,
    value,
    subtitle,
    icon,
    color = 'primary',
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color?: 'primary' | 'success' | 'warning' | 'error';
}) {
    const colorMap = {
        primary: '#3b82f6',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
    };

    return (
        <Card sx={{ height: '100%', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="overline" color="textSecondary" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color={colorMap[color]}>
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography variant="body2" color="textSecondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ color: colorMap[color], opacity: 0.7 }}>
                        {icon}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

export default function MonitoringDashboard() {
    const [data, setData] = useState<AgentMonitoringData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/monitoring');
            const result = await response.json();

            if (result.success) {
                setData(result.data);
                setLastUpdate(new Date());
                setError(null);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Failed to fetch monitoring data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) {
        return (
            <Box p={3}>
                <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                    {[1, 2, 3, 4].map((i) => (
                        <Grid item xs={6} md={3} key={i}>
                            <Skeleton variant="rectangular" height={120} />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error">
                    <AlertTitle>Error</AlertTitle>
                    {error}
                </Alert>
            </Box>
        );
    }

    if (!data) return null;

    const formatEth = (wei: string) => {
        const eth = Number(wei) / 1e18;
        return eth.toFixed(2) + ' ETH';
    };

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString();
    };

    return (
        <Box sx={{ minHeight: '100vh', background: '#0f172a', color: 'white', p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        Agent Monitoring
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Last updated: {lastUpdate?.toLocaleTimeString() || '-'}
                    </Typography>
                </Box>
                <Tooltip title="Refresh">
                    <IconButton onClick={fetchData} disabled={loading}>
                        <Refresh sx={{ color: loading ? 'grey' : 'white' }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Alerts */}
            {data.alerts.length > 0 && (
                <Box mb={3}>
                    {data.alerts.slice(0, 3).map((alert, idx) => (
                        <Alert
                            key={idx}
                            severity={alert.level === 'critical' ? 'error' : alert.level}
                            sx={{ mb: 1 }}
                        >
                            {alert.message}
                        </Alert>
                    ))}
                </Box>
            )}

            {/* Circuit Breaker Banner */}
            {data.risk.circuitBroken && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    <AlertTitle>🚨 CIRCUIT BREAKER ACTIVE</AlertTitle>
                    All trading is halted. Portfolio drawdown exceeded safety threshold.
                </Alert>
            )}

            {/* Metric Cards */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={6} md={3}>
                    <MetricCard
                        title="Active Agents"
                        value={data.agents.active}
                        subtitle={`${data.agents.total} total`}
                        icon={<Speed sx={{ fontSize: 40 }} />}
                        color="success"
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <MetricCard
                        title="Active Delegations"
                        value={data.delegations.active}
                        subtitle={`TVL: ${formatEth(data.delegations.totalValueLocked)}`}
                        icon={<AccountBalance sx={{ fontSize: 40 }} />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <MetricCard
                        title="Trades (1h)"
                        value={`${data.risk.tradesLastHour} / 5`}
                        subtitle="Rate limit"
                        icon={<Timeline sx={{ fontSize: 40 }} />}
                        color={data.risk.tradesLastHour >= 4 ? 'warning' : 'success'}
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <MetricCard
                        title="Drawdown"
                        value={`${data.risk.currentDrawdown.toFixed(1)}%`}
                        subtitle="Max: 10%"
                        icon={data.risk.currentDrawdown > 0 ? <TrendingDown sx={{ fontSize: 40 }} /> : <TrendingUp sx={{ fontSize: 40 }} />}
                        color={data.risk.currentDrawdown > 5 ? 'warning' : data.risk.circuitBroken ? 'error' : 'success'}
                    />
                </Grid>
            </Grid>

            {/* Two Column Layout */}
            <Grid container spacing={3}>
                {/* System Health */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h6" mb={2}>System Health</Typography>
                            <Grid container spacing={2}>
                                {Object.entries(data.system).map(([key, status]) => (
                                    <Grid item xs={6} key={key}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" p={1}>
                                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                                {key.replace(/([A-Z])/g, ' $1')}
                                            </Typography>
                                            <StatusChip status={status} />
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Risk Metrics */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h6" mb={2}>Risk Metrics</Typography>

                            {/* Drawdown Progress */}
                            <Box mb={2}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">Drawdown</Typography>
                                    <Typography variant="body2">{data.risk.currentDrawdown.toFixed(1)}% / 10%</Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min(data.risk.currentDrawdown * 10, 100)}
                                    color={data.risk.currentDrawdown > 5 ? 'warning' : 'primary'}
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                            </Box>

                            {/* Rate Limit Progress */}
                            <Box mb={2}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">Rate Limit</Typography>
                                    <Typography variant="body2">{data.risk.tradesLastHour} / 5 trades</Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={data.risk.tradesLastHour * 20}
                                    color={data.risk.tradesLastHour >= 4 ? 'warning' : 'success'}
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                            </Box>

                            {/* Other metrics */}
                            <Box display="flex" justifyContent="space-between" pt={1}>
                                <Typography variant="body2" color="textSecondary">Daily Volume</Typography>
                                <Typography variant="body2">{formatEth(data.risk.dailyVolume)}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" pt={1}>
                                <Typography variant="body2" color="textSecondary">Open Positions</Typography>
                                <Typography variant="body2">{data.risk.openPositions}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Trades */}
                <Grid item xs={12}>
                    <Card sx={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h6" mb={2}>Recent Trades</Typography>

                            {data.recentTrades.length === 0 ? (
                                <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>
                                    No recent trades
                                </Typography>
                            ) : (
                                <TableContainer component={Paper} sx={{ background: 'transparent' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ color: 'grey' }}>Time</TableCell>
                                                <TableCell sx={{ color: 'grey' }}>Agent</TableCell>
                                                <TableCell sx={{ color: 'grey' }}>Market</TableCell>
                                                <TableCell sx={{ color: 'grey' }}>Direction</TableCell>
                                                <TableCell sx={{ color: 'grey' }}>Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {data.recentTrades.map((trade) => (
                                                <TableRow key={trade.id}>
                                                    <TableCell sx={{ color: 'white' }}>{formatTime(trade.timestamp)}</TableCell>
                                                    <TableCell sx={{ color: 'white' }}>{trade.agentName}</TableCell>
                                                    <TableCell sx={{ color: 'white', fontFamily: 'monospace' }}>
                                                        {trade.marketId.slice(0, 8)}...
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={trade.direction}
                                                            size="small"
                                                            color={trade.direction === 'YES' ? 'success' : 'error'}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={trade.status}
                                                            size="small"
                                                            color={trade.status === 'success' ? 'success' : 'error'}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
