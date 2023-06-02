// ==============================|| OVERRIDES - TABLE ROW ||============================== //

export default function TableRow() {
    return {
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:last-of-type': {
                        // '& .MuiTableCell-root': {
                        //     borderBottom: 'none'
                        // }
                    },
                    '& .MuiTableCell-root': {
                        paddingLeft: 18,
                        '&:last-of-type': {
                            paddingRight: 18,
                        },
                        '&:first-of-type': {
                            paddingLeft: 18,
                        }
                    }
                }
            }
        }
    };
}
