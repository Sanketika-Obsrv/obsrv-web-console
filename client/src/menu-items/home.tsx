import { FormattedMessage } from 'react-intl';
import { HomeOutlined, DashboardOutlined } from '@ant-design/icons';
import { NavItemType } from 'types/menu';
import { metricsMetadata } from 'data/metrics'

const icons = { HomeOutlined, DashboardOutlined };

const other: NavItemType = {
    id: 'dashboard',
    title: <FormattedMessage id="Dashboard" />,
    type: 'group',
    children: [
        ...(metricsMetadata.map(metric => ({
            id: metric.id,
            title: <FormattedMessage id={metric.primaryLabel} />,
            type: 'item',
            url: `/`,
            icon: metric.menuIcon || icons.HomeOutlined,
        })))
    ]
};

export default other;


