import { FormattedMessage } from 'react-intl';
import { HomeOutlined, DashboardOutlined } from '@ant-design/icons';
import { NavItemType } from 'types/menu';
import { metricsMetadata } from 'data/metrics'
import _ from 'lodash';

const icons = { HomeOutlined, DashboardOutlined };

const other: NavItemType = {
    id: 'dashboard',
    title: <FormattedMessage id="dashboard" />,
    type: 'group',
    children: [
        {
            id: '',
            title: <FormattedMessage id="home" />,
            type: 'item',
            url: '/',
            icon: icons.HomeOutlined
        },
        ...(metricsMetadata.map(metric => ({
            id: metric.id,
            title: <FormattedMessage id={_.toLower(metric.primaryLabel)} />,
            type: 'item',
            url: `/metrics/details/${metric.id}`,
            icon: metric.menuIcon || icons.HomeOutlined,
            rotate: metric.rotate
        })))
    ]
};

export default other;


