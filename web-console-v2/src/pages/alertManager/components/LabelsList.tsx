import { useMemo } from 'react';
import MainCard from 'components/MainCard';
import ScrollX from 'components/ScrollX';
import * as _ from 'lodash';
import TableWithCustomHeader from 'components/TableWithCustomHeader';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Stack, Tooltip } from '@mui/material';
import { IconButton } from '@mui/material';

const LabelsList = (props: any) => {
    const { labels, updateLabels, updateFormState, edit } = props;

    const updateLabelsState = (label: string) => {
        const currentIndex = _.findIndex(labels, (labelObj: any) => labelObj.label === label);
        const filteredLabels = _.remove(labels, (labelObj: any, index: number) => currentIndex !== index);
        updateLabels(filteredLabels);
    }

    const actions = useMemo(() =>[
        {
            label: "Edit",
            color: "primary",
            size: "large",
            icon: <EditOutlined />,
            onClick: async (context: Record<string, any>) => {
                const { payload } = context;
                const { label, value } = payload;
                updateFormState({ label, value });
                updateLabelsState(label)
                edit(true);
            }
        },
        {
            label: "Delete",
            color: "primary",
            size: "large",
            icon: <DeleteOutlined />,
            onClick: async (context: Record<string, any>) => {
                const { payload } = context;
                const { label } = payload;
                updateLabelsState(label)
            }
        }
    ], [labels]);

    const renderAction = (payload: Record<string, any>) => (action: Record<string, any>) => {
        const { label, color, size, icon, onClick } = action;
        return <Tooltip key={Math.random()} title={label} onClick={(e: any) => onClick({ payload })}>
            <IconButton color={color} size={size}>
                {icon}
            </IconButton>
        </Tooltip>
    }

    const columns = useMemo(
        () => [
            {
                Header: 'Label',
                accessor: 'label',
                disableFilters: true,
            },
            {
                Header: 'Value',
                accessor: 'value',
                disableFilters: true,
            },
            {
                Header: 'Actions',
                disableFilters: true,
                Cell({ cell }: any) {
                    const row = cell?.row?.original || {};
                    return <Stack direction="row" justifyContent="flex-start" alignItems="center">
                        {_.map(actions, renderAction(row))}
                    </Stack>
                }
            }
        ],
        [labels]
    );

    return (
        <MainCard content={false}>
            <ScrollX>
                <TableWithCustomHeader columns={columns} renderHeader={null} data={labels} />
            </ScrollX>
        </MainCard>
    );
};

export default LabelsList;