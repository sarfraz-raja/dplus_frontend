import { grafanaOrigin } from '../../utils/url';
import { useTheme } from '../../context/ThemeContext';

const GrafanaDashboard = ({ accessToken, height = '100%' }) => {
    const { theme } = useTheme();
    if (!accessToken) return null;
    const url = `${grafanaOrigin}/public-dashboards/${accessToken}?kiosk&theme=${theme}`;
    return (
        <iframe
            src={url}
            title="Dashboard"
            style={{ width: '100%', height, border: 'none' }}
        />
    );
};

export default GrafanaDashboard;
