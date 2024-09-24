import { Box, Button, Toolbar, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import SplitPane from 'react-split-pane';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import Editor from '@monaco-editor/react';
import { useSelector } from "react-redux";
import JSONata from 'jsonata';
import * as _ from "lodash";

const Pane = styled(Box)({
    width: '100%',
    height: '100%',
    resize: 'none',
    overflow: 'scroll',
    overflowY: 'scroll',
    fontSize: '13px',
    bgcolor: '#e9e9e9',
});

const options = {
    "acceptSuggestionOnCommitCharacter": true,
    "acceptSuggestionOnEnter": "on",
    "accessibilitySupport": "auto",
    "autoIndent": false,
    "automaticLayout": true,
    "codeLens": true,
    "colorDecorators": true,
    "contextmenu": true,
    "cursorBlinking": "blink",
    "cursorSmoothCaretAnimation": false,
    "cursorStyle": "line",
    "disableLayerHinting": false,
    "disableMonospaceOptimizations": false,
    "dragAndDrop": false,
    "fixedOverflowWidgets": false,
    "folding": true,
    "foldingStrategy": "auto",
    "fontLigatures": false,
    "formatOnPaste": false,
    "formatOnType": false,
    "hideCursorInOverviewRuler": false,
    "highlightActiveIndentGuide": true,
    "links": true,
    "mouseWheelZoom": false,
    "multiCursorMergeOverlapping": true,
    "multiCursorModifier": "alt",
    "overviewRulerBorder": true,
    "overviewRulerLanes": 2,
    "quickSuggestions": true,
    "quickSuggestionsDelay": 100,
    "readOnly": false,
    "renderControlCharacters": false,
    "renderFinalNewline": true,
    "renderIndentGuides": true,
    "renderLineHighlight": "all",
    "renderWhitespace": "none",
    "revealHorizontalRightPadding": 30,
    "roundedSelection": true,
    "rulers": [],
    "scrollBeyondLastColumn": 5,
    "scrollBeyondLastLine": false,
    "selectOnLineNumbers": true,
    "selectionClipboard": true,
    "selectionHighlight": true,
    "showFoldingControls": "mouseover",
    "smoothScrolling": false,
    "suggestOnTriggerCharacters": true,
    "wordBasedSuggestions": true,
    "wordSeparators": "~!@#$%^&*()-=+[{]}|;:'\",.<>/?",
    "wordWrap": "off",
    "wordWrapBreakAfterCharacters": "\t})]?|&,;",
    "wordWrapBreakBeforeCharacters": "{([+",
    "wordWrapBreakObtrusiveCharacters": ".",
    "wordWrapColumn": 80,
    "wordWrapMinified": true,
    "wrappingIndent": "none",
    "minimap": {
        "enabled": false
    },
};

const JSONataPlayground = ({ handleClose, evaluationData, setEvaluationData, transformErrors, setTransformErrors, closeTransformations, setSampleEvent }: any) => {
    const stringifyWithFormat = (data: any) => {
        return JSON.stringify(data, null, 4);
    }
    const jsonData: any = useSelector((state: any) => state?.wizard?.pages?.datasetConfiguration?.state?.data);
    const mergedEvent = useSelector((state: any) => state?.wizard?.metadata?.event?.mergedEvent || state?.wizard?.pages?.sample_data || {});
    let data = {};
    _.map(jsonData, (item: any) => {
        data = _.merge(data, item)
    });

    const playgroundData = _.has(mergedEvent, "$schema") ? {} : mergedEvent;
    const [sampleData, setSampleData] = useState<any>(stringifyWithFormat(_.isEmpty(data) ? playgroundData : data));
    const [previewData, setPreviewData] = useState<string>('');

    useEffect(() => {
        const timer = setTimeout(() => {
            checkInputDataValid();
        }, 500);
        setSampleEvent(sampleData)

        return () => {
            clearTimeout(timer);
        };
    }, [sampleData, evaluationData]);

    const checkInputDataValid = async () => {
        let input: any = '';
        try {
            if (sampleData !== 'undefined' && sampleData !== '') {
                input = JSON.parse(sampleData);
            } else {
                input = undefined;
            }
        } catch (err: any) {
            setPreviewData(`ERROR IN INPUT DATA: ${err.message}`);
            setTransformErrors(true);
            return;
        }

        if (!evaluationData) {
            const message = '^^ Enter a JSONata expression in the box above ^^';
            setPreviewData(message);
            setTransformErrors(false);
        } else {
            try {
                const ata: any = JSONata(evaluationData);
                const data: any = await ata.evaluate(JSON.parse(sampleData));
                if (!data) {
                    setPreviewData("No match");
                    setTransformErrors(true);
                }
                else {
                    setPreviewData(stringifyWithFormat(data));
                    setTransformErrors(false);
                }
            } catch (err: any) {
                setPreviewData(err.message || String(err));
                setTransformErrors(true);
                return;
            }
        }
    }

    const handleInputChange = (value: any, event: any) => {
        setSampleData(value);
    }

    const handleExpressionChange = (value: any, event: any) => {
        setEvaluationData(value);
    }
    return (
        <>
            <Toolbar sx={{ justifyContent: 'space-between' }}>
                <Typography variant="h4">Try JSONata transformations</Typography>
                <Box display="flex" alignItems="center" justifyContent="space-around">
                    <Button sx={{ mx: 1 }} size="medium" onClick={closeTransformations}>
                        <Typography variant="h6" alignItems="center" fontWeight="500" display="flex">
                            Discard and Close <CloseIcon fontSize="small" />
                        </Typography>
                    </Button>
                    <Button sx={{ mx: 1 }} size="medium" onClick={handleClose}>
                        <Typography variant="h6" alignItems="center" fontWeight="500" display="flex">
                            Save and Close<CloseIcon fontSize="small" />
                        </Typography>
                    </Button>
                </Box>
            </Toolbar>
            <Box display="flex" alignItems="center">
                <SplitPane split="vertical" minSize={100} defaultSize={'50%'} allowResize={true}>
                    <SplitPane split="horizontal" minSize={100} size={'100%'} primary="second" allowResize={true}>
                        <Pane>
                            <Typography variant="h5" px={3} py={1}>Input data for transformations</Typography>
                            <Editor
                                height="82vh"
                                language="json"
                                theme="clouds"
                                defaultValue={sampleData}
                                onChange={handleInputChange}
                                options={options as any}
                            />
                        </Pane>
                    </SplitPane>
                    <SplitPane split="horizontal" minSize={50} defaultSize={350}>
                        <Pane>
                            <Typography variant="h5" px={3} py={1}>JSONata transformation expressions</Typography>
                            <Editor
                                height="45vh"
                                language="jsonata"
                                theme="clouds"
                                defaultValue={evaluationData}
                                options={options as any}
                                onChange={handleExpressionChange}
                            />
                        </Pane>
                        <Pane>
                            <Typography variant="h5" px={3} py={1}>Output data post transformations</Typography>
                            <Editor
                                height="34vh"
                                language="jsonata"
                                theme="clouds"
                                value={previewData}
                                options={options as any}
                                onChange={undefined}
                                className={transformErrors ? "error-class" : ""}
                            />
                        </Pane>
                    </SplitPane>
                </SplitPane>
            </Box >
        </>
    );
};

export default JSONataPlayground;
