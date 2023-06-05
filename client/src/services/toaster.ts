import { openSnackbar } from 'store/reducers/snackbar';

const defaultConfig = {
    open: true,
    message: 'Something went wrong',
    anchorOrigin: { vertical: 'top', horizontal: 'center' },
    variant: 'alert',
    alert: {
        color: 'error'
    },
    close: false
}

export const success = (config: Partial<typeof defaultConfig>) => {
    return openSnackbar({ ...defaultConfig, alert: { color: 'success' }, ...config })
}

export const error = (config: Partial<typeof defaultConfig>) => {
    return openSnackbar({ ...defaultConfig, ...config })
}