import { Alert, Stack } from "@mui/material";
import { useState } from "react";

const SchemaConflicts = (props: any) => {
    const [conflicts, setConflicts] = useState();
    return <>
        <Stack spacing={1}>
            <Alert severity="error"> <b>property</b> property does not exists in the schema </Alert>
        </Stack>
    </>
}

export default SchemaConflicts;