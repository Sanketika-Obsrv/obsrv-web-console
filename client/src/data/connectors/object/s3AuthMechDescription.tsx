import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Grid, Tooltip, Typography } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useEffect, useState } from "react";

const S3uthMechanismDescription = (props: Record<string, any>) => {
    const { bucket_name = "bucket_name" } = props;
    const [copyDescription, setCopyDescription] = useState<string>("Copy")
    const [expandAccordian, setExpand] = useState<boolean>(false)

    const description = JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "Statement0",
                "Effect": "Allow",
                "Action": [
                    "s3:ListBucket",
                    "s3:GetObject",
                    "s3:GetObjectAttributes",
                    "s3:GetObjectTagging",
                    "s3:PutObjectTagging",
                    "s3:DeleteObjectTagging"
                ],
                "Resource": [
                    `arn:aws:s3:::${bucket_name || 'bucket_name'}`,
                    `arn:aws:s3:::${bucket_name || 'bucket_name'}/*`
                ]
            }
        ]
    }, null, 2)

    useEffect(() => {
        setCopyDescription("Copy")
    }, [bucket_name])

    const handleCopy = () => {
        navigator.clipboard.writeText(description)
        setCopyDescription("Copied")
    }

    const handleChange = () => {
        setExpand(!expandAccordian)
    }

    return <>
        <Accordion expanded={expandAccordian} onChange={handleChange} sx={{ border: "none", borderRadius: "4px" }}>
            <AccordionSummary aria-controls="panel1d-content" id="panel1d-header" sx={{ bgcolor: '#E9F7F8', paddingLeft: 0 }}>
                <Alert severity="info" sx={{ lineHeight: 0, display: "flex", justifyContent: "center" }}>
                    <Typography variant="caption" fontSize={14}>
                        It is recommended to create a new IAM user in AWS and assign the following policy that limits it to certain operations.
                    </Typography>
                </Alert>
            </AccordionSummary>
            <AccordionDetails sx={{ margin: "0rem", bgcolor: "secondary.100" }}>
                <Grid container>
                    <Grid item xs={10}>
                        <Typography variant="caption" fontSize={14}>
                            <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{description}</pre>
                        </Typography>
                    </Grid>
                    <Grid item xs={2} marginTop={1.5} textAlign={'center'}>
                        <Tooltip title={copyDescription}>
                            <Button color='secondary' size='medium' endIcon={copyDescription == "Copy" ? <ContentCopyIcon /> : <CheckIcon />} onClick={handleCopy} variant='dashed'>
                                {copyDescription}
                            </Button>
                        </Tooltip>
                    </Grid>
                </Grid>
            </AccordionDetails>
        </Accordion>
    </>
}

export default S3uthMechanismDescription;