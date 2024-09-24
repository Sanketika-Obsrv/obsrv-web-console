import { FormattedMessage } from 'react-intl';
import { TableOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { NavItemType } from 'types/menu';
import { DatasetStatus } from 'types/datasets';

const icons = {
    TableOutlined,
    PlusCircleOutlined
};

const other: NavItemType = {
    id: 'datasets',
    title: <FormattedMessage id="datasets" />,
    type: 'group',
    children: [
        {
            id: 'datasets',
            title: <FormattedMessage id="datasets" />,
            type: 'item',
            url: `/datasets?status=${DatasetStatus.Live}`,
            icon: icons.TableOutlined,
        },
        {
            id: 'new',
            title: <FormattedMessage id="new-dataset" />,
            type: 'item',
            url: '/dataset/new',
            icon: icons.PlusCircleOutlined
        },
        {
            id: 'master',
            title: <FormattedMessage id="new-master-dataset" />,
            type: 'item',
            url: '/dataset/new/master?master=true',
            icon: icons.PlusCircleOutlined
        },
    ]
};

export default other;
