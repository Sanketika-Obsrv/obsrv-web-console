import { FormattedMessage } from 'react-intl';
import { MailOutlined, AlertOutlined } from '@ant-design/icons';
import { NavItemType } from 'types/menu';

const icons = { MailOutlined, AlertOutlined };

const alertMenuItems: NavItemType = {
    id: 'administration',
    title: <FormattedMessage id="administration" />,
    type: 'group',
    children: [
        {
            id: 'alertRules',
            title: <FormattedMessage id="alerts" />,
            type: 'item',
            url: '/alertRules/custom',
            icon: icons.AlertOutlined,
        },
        {
            id: 'alertChannels',
            title: <FormattedMessage id="notification-channels" />,
            type: 'item',
            url: '/alertChannels',
            icon: icons.MailOutlined,
        }
    ]
};

export default alertMenuItems;
