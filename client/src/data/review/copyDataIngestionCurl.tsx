import { Check, ContentCopy } from "@mui/icons-material";
import { Box, Button, Grid, Stack, Tooltip, Typography } from "@mui/material";
import _ from "lodash";
import { useState } from "react";
import { v4 } from "uuid";

const getCurlCommand = ({ datasetId,configuredBatchId, configuredBatchKey, isBatch = false }: Record<string, any>) => {
    const curlCommands: any = {
        true: [`curl --location '{{api-host}}/data/v1/in/${datasetId}'`,
            `\ --header 'Content-Type: application/json'`,
        `\ --data '{\"data\": {"${configuredBatchId}": "${v4()}" ,"${configuredBatchKey}": [{}]}}'`],
        false: [`curl --location '{{api-host}}/data/v1/in/${datasetId}'`,
            `\ --header 'Content-Type: application/json'`,
            `\ --data '{\"data\": {\"event\": {}}}'`]
    }
    return _.get(curlCommands, `${isBatch}`) || []
}

const DataIngestCURLCopy = (props: any) => {
    const { datasetId, dataFormatConfig } = props;
    const [sourceConfigCopy, setSourceConfigCopy] = useState("Copy")

    const isBatch: boolean = _.lowerCase(_.get(dataFormatConfig, ["value", "type"])) === "yes" || false
    const configuredBatchId = isBatch ? _.get(dataFormatConfig, ["value", "batchId"]) || null : null
    const configuredBatchKey = isBatch ? _.get(dataFormatConfig, ["value", "extractionKey"]) || "id" : null

    const handleCopy = () => {
        navigator.clipboard.writeText(getCurlCommand({ datasetId, configuredBatchId, configuredBatchKey, isBatch }).join(encodeURIComponent('')) || "");
        setSourceConfigCopy("Copied");
    };

    return <Box sx={{ bgcolor: "secondary.100" }}>
        <Grid container>
            <Grid item xs={12} m={1}>
                <Stack direction={"row"} justifyContent={"space-between"}>
                    <Grid item ml={1} sx={{ display: "flex", flexDirection: 'column' }}>
                        {_.map(getCurlCommand({ datasetId, configuredBatchId, configuredBatchKey, isBatch }), sentences => {
                            return <Typography variant="caption" fontSize={14}>{sentences}</Typography>
                        })}
                    </Grid>
                    <Grid item textAlign={'center'} mr={1}>
                        <Tooltip title={sourceConfigCopy}>
                            <Button color='secondary' size='medium' endIcon={sourceConfigCopy === "Copy" ? <ContentCopy /> : <Check />} onClick={handleCopy} variant='dashed'>
                                {sourceConfigCopy}
                            </Button>
                        </Tooltip>
                    </Grid>
                </Stack>
            </Grid>
        </Grid>
    </Box>
}

export default DataIngestCURLCopy;