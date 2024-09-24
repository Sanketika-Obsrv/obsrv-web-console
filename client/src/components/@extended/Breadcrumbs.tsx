import { CSSProperties, ReactElement, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MuiBreadcrumbs from '@mui/material/Breadcrumbs';
import { useTheme } from '@mui/material/styles';
import { Divider, Grid, Typography } from '@mui/material';
import MainCard from '../MainCard';
import { ApartmentOutlined, HomeOutlined, HomeFilled } from '@ant-design/icons';
import { OverrideIcon } from 'types/root';
import { NavItemType } from 'types/menu';
import { useSelector } from 'react-redux';
export interface BreadCrumbSxProps extends CSSProperties {
    mb?: string;
    bgcolor?: string;
}
interface Props {
    card?: boolean;
    divider?: boolean;
    icon?: boolean;
    icons?: boolean;
    maxItems?: number;
    navigation?: { items: NavItemType[] };
    rightAlign?: boolean;
    separator?: OverrideIcon;
    title?: boolean;
    titleBottom?: boolean;
    sx?: BreadCrumbSxProps;
}

const Breadcrumbs = ({
    card,
    divider = true,
    icon,
    icons,
    maxItems,
    navigation,
    rightAlign,
    separator,
    title,
    titleBottom,
    sx,
    ...others
}: Props) => {
    const theme = useTheme();
    const location = useLocation();
    const [main, setMain] = useState<NavItemType | undefined>();
    const [item, setItem] = useState<NavItemType>();
    const config: any = useSelector((state: any) => state?.wizard?.pages?.datasetConfiguration);
    const [replaceLabel, setReplaceLabel] = useState('');

    useEffect(() => {
        if (config?.state?.config?.name) setReplaceLabel(config?.state?.config?.name);
        else setReplaceLabel('');
    }, [config]);

    const iconSX = {
        marginRight: theme.spacing(0.75),
        marginTop: `-${theme.spacing(0.25)}`,
        width: '1rem',
        height: '1rem',
        color: theme.palette.secondary.main
    };

    useEffect(() => {
        navigation?.items?.map((menu: NavItemType, index: number) => {
            if (menu.type && menu.type === 'group') {
                getCollapse(menu as { children: NavItemType[]; type?: string });
            }
            return false;
        });
    });

    let customLocation = location.pathname;

    if (customLocation === '/components-overview/breadcrumbs') {
        customLocation = '/dashboard/analytics';
    }

    if (customLocation === '/apps/kanban/backlogs') {
        customLocation = '/apps/kanban/board';
    }

    const getCollapse = (menu: NavItemType) => {
        if (menu.children) {
            menu.children.filter((collapse: NavItemType) => {
                if (collapse.type && collapse.type === 'collapse') {
                    getCollapse(collapse as { children: NavItemType[]; type?: string });
                } else if (collapse.type && collapse.type === 'item') {
                    if (customLocation === collapse.url) {
                        setMain(menu);
                        setItem(collapse);
                    }
                }
                return false;
            });
        }
    };


    const SeparatorIcon = separator!;
    const separatorIcon = separator ? <SeparatorIcon style={{ fontSize: '0.75rem', marginTop: 2 }} /> : '/';

    let mainContent;
    let itemContent;
    let breadcrumbContent: ReactElement = <Typography />;
    let itemTitle: NavItemType['title'] = '';
    let CollapseIcon;
    let ItemIcon;


    if (main && main.type === 'collapse') {
        CollapseIcon = main.icon ? main.icon : ApartmentOutlined;
        mainContent = (
            <Typography component={Link} to={document.location.pathname} variant="h6" sx={{ textDecoration: 'none' }} color="textSecondary">
                {icons && <CollapseIcon style={iconSX} />}
                {main.title}
            </Typography>
        );
    }

    // items
    if (item && item.type === 'item') {
        itemTitle = item.title;

        ItemIcon = item.icon ? item.icon : ApartmentOutlined;
        if (location.pathname.includes('/dataset/') && replaceLabel !== '')
            itemTitle = replaceLabel;

        itemContent = (
            <Typography variant="subtitle1" color="textPrimary">
                {icons && <ItemIcon style={iconSX} />}
                {itemTitle}
            </Typography>
        );

        if (item.breadcrumbs !== false) {
            breadcrumbContent = (
                <MainCard
                    border={card}
                    sx={card === false ? { bgcolor: 'transparent', ...sx } : { ...sx }}
                    {...others}
                    content={card}
                    shadow="none"
                >
                    <Grid
                        container
                        direction={rightAlign ? 'row' : 'column'}
                        justifyContent={rightAlign ? 'space-between' : 'flex-start'}
                        alignItems={rightAlign ? 'center' : 'flex-start'}
                        spacing={1}
                    >
                        {title && !titleBottom && (
                            <Grid item>
                                <Typography variant="h2">{item.title}</Typography>
                            </Grid>
                        )}
                        <Grid item>
                            <MuiBreadcrumbs aria-label="breadcrumb" maxItems={maxItems || 8} separator={separatorIcon}>
                                <Typography component={Link} to="/" color="textSecondary" variant="h6" sx={{ textDecoration: 'none' }}>
                                    {icons && <HomeOutlined style={iconSX} />}
                                    {icon && !icons && <HomeFilled style={{ ...iconSX, marginRight: 0 }} />}
                                    {(!icon || icons) && 'Home'}
                                </Typography>
                                {mainContent}
                                {itemContent}
                            </MuiBreadcrumbs>
                        </Grid>
                    </Grid>
                    {card === false && divider !== false && <Divider sx={{ mt: 2 }} />}
                </MainCard>
            );
        }
    }

    return breadcrumbContent;
};

export default Breadcrumbs;
