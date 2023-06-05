import { forwardRef, CSSProperties, ReactNode, Ref } from 'react';


import { useTheme } from '@mui/material/styles';
import { Card, CardContent, CardHeader, Divider, Typography, CardProps, CardHeaderProps, CardContentProps } from '@mui/material';


import { KeyedObject } from 'types/root';


const defaultHeaderSX = {
    px: 2.5,
    py: 1,
    minHeight: 50,
    '& .MuiCardHeader-action': { m: '0px auto', alignSelf: 'center' }
};


export interface MainCardProps extends KeyedObject {
    border?: boolean;
    boxShadow?: boolean;
    children: ReactNode | string;
    subheader?: ReactNode | string;
    style?: CSSProperties;
    content?: boolean;
    contentSX?: CardContentProps['sx'];
    darkTitle?: boolean;
    divider?: boolean;
    sx?: CardProps['sx'];
    secondary?: CardHeaderProps['action'];
    shadow?: string;
    elevation?: number;
    title?: ReactNode | string;
    tagLine?: string;
    modal?: boolean;
}

const MainCard = forwardRef(
    (
        {
            border = true,
            boxShadow,
            children,
            subheader,
            content = true,
            contentSX = { px: 3, background: '#f8f8f8' },
            headerSX = { ...defaultHeaderSX },
            darkTitle,
            divider = true,
            elevation,
            secondary,
            shadow,
            sx = {},
            title,
            tagLine,
            modal = false,
            ...others
        }: MainCardProps,
        ref: Ref<HTMLDivElement>
    ) => {
        const theme = useTheme();
        boxShadow = theme.palette.mode === 'dark' ? boxShadow || true : boxShadow;

        return (
            <Card
                elevation={elevation || 0}
                ref={ref}
                {...others}
                sx={{
                    position: 'relative',
                    border: border ? '1px solid' : 'none',
                    borderRadius: 1,
                    borderColor: theme.palette.mode === 'dark' ? theme.palette.divider : theme.palette.grey.A800,
                    boxShadow: boxShadow && (!border || theme.palette.mode === 'dark') ? shadow || theme.customShadows.z1 : 'inherit',
                    ':hover': {
                        boxShadow: boxShadow ? shadow || theme.customShadows.z1 : 'inherit'
                    },
                    ...(modal && {
                        position: 'absolute' as 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: { xs: `calc( 100% - 50px)`, sm: 'auto' },
                        '& .MuiCardContent-root': {
                            overflowY: 'auto',
                            minHeight: 'auto',
                            maxHeight: `calc(100vh - 200px)`
                        }
                    }),
                    ...sx
                }}
            >
                {!darkTitle && title && (
                    <CardHeader
                        sx={headerSX}
                        titleTypographyProps={{ variant: 'h5' }}
                        title={title}
                        action={secondary}
                        subheader={subheader}
                    />
                )}
                {darkTitle && title && <CardHeader sx={headerSX} title={<Typography variant="h4">{title}</Typography>} action={secondary} />}
                {tagLine && (
                    <CardHeader
                        sx={{ ...headerSX, pt: 1, pb: 3 }}
                        titleTypographyProps={{ variant: 'body2', color: 'secondary' }}
                        title={tagLine}
                        action={secondary}
                        subheader={subheader}
                    />
                )}
                {title && divider && <Divider />}


                {content && <CardContent sx={contentSX}>{children}</CardContent>}
                {!content && children}
            </Card>
        );
    }
);

export default MainCard;
