import MonitoringDashboard from '@/components/monitoring/MonitoringDashboard';

export const metadata = {
    title: 'Agent Monitoring | AYIN',
    description: 'Real-time monitoring dashboard for AYIN agents',
};

export default function MonitoringPage() {
    return <MonitoringDashboard />;
}
