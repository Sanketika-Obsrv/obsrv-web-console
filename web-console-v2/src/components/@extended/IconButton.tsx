import React, { forwardRef, ReactNode, ReactElement, ReactPortal, Ref } from 'react';

import MuiIconButton from '@mui/material/IconButton';
import { alpha, styled, useTheme } from '@mui/material/styles';
import { IconButtonProps } from '@mui/material';

import getColors from 'utils/getColors';

import { ButtonVariantProps, ExtendedStyleProps, IconButtonShapeProps } from 'types/extended';
import { theme } from 'theme';

interface IconButtonStyleProps extends ExtendedStyleProps {
    variant?: ButtonVariantProps;
}

function getColorStyle({ variant, color }: IconButtonStyleProps) {
    const colors = getColors(color);
    const { lighter, light, dark, main, contrastText } = colors;

    const buttonShadow = `${color}Button`;
    const shadows = "none";

    const commonShadow = {
        '&::after': {
            boxShadow: `0 0 6px 6px ${alpha(main, 0.9)}`
        },
        '&:active::after': {
            boxShadow: `0 0 0 0 ${alpha(main, 0.9)}`
        },
        '&:focus-visible': {
            outline: `2px solid ${dark}`,
            outlineOffset: 2
        }
    };

    switch (variant) {
        case 'contained':
            return {
                color: contrastText,
                backgroundColor: main,
                '&:hover': {
                    backgroundColor: dark
                },
                ...commonShadow
            };
        case 'light':
            return {
                color: main,
                backgroundColor: lighter,
                '&:hover': {
                    backgroundColor: light
                },
                ...commonShadow
            };
        case 'shadow':
            return {
                boxShadow: 'none',
                color: contrastText,
                backgroundColor: main,
                '&:hover': {
                    boxShadow: 'none',
                    backgroundColor: dark
                },
                ...commonShadow
            };
        case 'outlined':
            return {
                '&:hover': {
                    backgroundColor: 'transparent',
                    color: dark,
                    borderColor: dark
                },
                ...commonShadow
            };
        case 'dashed':
            return {
                backgroundColor: lighter,
                '&:hover': {
                    color: dark,
                    borderColor: dark
                },
                ...commonShadow
            };
        case 'text':
        default:
            return {
                '&:hover': {
                    color: dark,
                    backgroundColor: lighter
                },
                ...commonShadow
            };
    }
}

interface StyleProps extends IconButtonStyleProps {
    shape?: IconButtonShapeProps;
}

const IconButtonStyle = styled(MuiIconButton, {
    shouldForwardProp: (prop) => prop !== 'variant' && prop !== 'shape'
})(({ variant, shape, color }: StyleProps) => ({
    position: 'relative',
    '::after': {
        content: '""',
        display: 'block',
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        borderRadius: shape === 'rounded' ? '50%' : 4,
        opacity: 0,
        transition: 'all 0.5s'
    },

    ':active::after': {
        position: 'absolute',
        borderRadius: shape === 'rounded' ? '50%' : 4,
        left: 0,
        top: 0,
        opacity: 1,
        transition: '0s'
    },
    ...(shape === 'rounded' && {
        borderRadius: '50%'
    }),
    ...(variant === 'outlined' && {
        border: '1px solid',
        borderColor: 'inherit'
    }),
    ...(variant === 'dashed' && {
        border: '1px dashed',
        borderColor: 'inherit'
    }),
    ...(variant !== 'text' && {
        '&.Mui-disabled': {
            backgroundColor: theme.palette.grey[200]
        }
    }),
    ...getColorStyle({ variant, color })
}));

export interface Props extends IconButtonProps {
    shape?: IconButtonShapeProps;
    variant?: ButtonVariantProps;
    children: ReactNode;
    tooltip?: boolean | ReactElement<any> | number | string | Iterable<ReactNode> | ReactPortal;
}

const IconButton = forwardRef(
    (
        {
            variant = 'text',
            shape = 'square',
            children,
            color = 'primary',
            tooltip,
            ...others
        }: Props,
        ref: Ref<HTMLButtonElement>
    ) => {

        return (
            <IconButtonStyle
                ref={ref}
                disableRipple
                variant={variant}
                shape={shape}
                color={color}
                {...others}
            >
                {children}
            </IconButtonStyle>
        );
    }
);

IconButton.displayName = 'IconButton';

export default IconButton;
