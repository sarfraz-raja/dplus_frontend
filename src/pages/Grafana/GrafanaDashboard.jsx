import { grafanaOrigin } from '../../utils/url';
import { useTheme } from '../../context/ThemeContext';

const GrafanaDashboard = ({ access_token, height = '100%' }) => {
    const { theme } = useTheme();
    if (!access_token) return null;
    const url = `${grafanaOrigin}/public-dashboards/${access_token}?kiosk&theme=${theme}`;
      return (
        <iframe
            src={url}
            title="Dashboard"
            style={{ width: '100%', height, border: 'none' }}
        />
    );
};

// const GrafanaDashboard = ({ dashboard_name, dashboard_uid, height = '100%' }) => {
//     const { theme } = useTheme();
//     if (!dashboard_uid) return null;
//     // const url = `${grafanaOrigin}/public-dashboards/${dashboard_uid}?kiosk&theme=${theme}`;
//     // const url = `${grafanaOrigin}/grafana/d/adr9k6f/dy-server-usage?orgId=1&kiosk&theme=${theme}`;
//     //  const url ="http://192.168.0.100/grafana/d/adr9k6f?orgId=1&kiosk&theme=light";
//     const url = `${grafanaOrigin}/grafana/d/${dashboard_uid}/${dashboard_name}?orgId=1&kiosk&theme=${theme}`;
//     console.log(dashboard_uid, url,"Dashboard UID and URL for Grafana Dashboard");
//     return (
//         <iframe
//             src={url}
//             title="Dashboard"
//             style={{ width: '100%', height, border: 'none' }}
//         />
//     );
// };

export default GrafanaDashboard;
