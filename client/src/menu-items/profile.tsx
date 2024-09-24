import { FormattedMessage } from 'react-intl';
import { AlertOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { NavItemType } from 'types/menu';
import { logout } from 'services/profile';
const icons = { AlertOutlined, LogoutOutlined, SettingOutlined };

const other: NavItemType = {
    id: 'profile',
    title: <FormattedMessage id="profile" />,
    type: 'group',
    children: [
        // {
        //     id: 'SystemSettings',
        //     title: <FormattedMessage id="SystemSettings" />,
        //     type: 'item',
        //     icon: icons.SettingOutlined,
        //     url: '/systemSettings'
        // },
        {
            id: 'Logout',
            title: <FormattedMessage id="logout" />,
            type: 'item',
            icon: icons.LogoutOutlined,
            onClick: logout
        }
    ]
};

export default other;


