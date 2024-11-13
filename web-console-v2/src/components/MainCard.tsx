import React, { forwardRef, CSSProperties, ReactNode, Ref } from 'react';

import { useTheme } from '@mui/material/styles';
import {
    Card,
    CardContent,
    CardHeader,
    Divider,
    Typography,
    CardProps,
    CardHeaderProps,
    CardContentProps
} from '@mui/material';
import { KeyedObject } from '../types/root';

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
            border = false,
            children,
            subheader,
            content = true,
            contentSX = { px: 3, background: '#f8f8f8' },
            headerSX = { ...defaultHeaderSX },
            darkTitle,
            divider = true,
            secondary,
            sx = {},
            title,
            tagLine,
            modal = false,
            ...others
        }: any,
        ref: Ref<HTMLDivElement>
    ) => {
        const theme = useTheme();

        return (
            <Card
                ref={ref}
                {...others}
                elevation={0}
                sx={{
                    position: 'relative',
                    border: border ? '1px solid' : 'none',
                    borderColor:
                        theme.palette.mode === 'dark'
                            ? theme.palette.divider
                            : theme.palette.grey[800],

                    ...(modal && {
                        position: 'absolute' as const,
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
                {darkTitle && title && (
                    <CardHeader
                        sx={headerSX}
                        title={<Typography variant="h4">{title}</Typography>}
                        action={secondary}
                    />
                )}
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

MainCard.displayName = 'MainCard';

export default MainCard;
