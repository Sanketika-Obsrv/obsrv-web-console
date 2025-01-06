import React from 'react';
import { useEffect, useRef } from "react";
import _ from "lodash"
import { JsonEditor } from "jsoneditor-react";

const TransformSpecEditor = ({ containerStyle = { 'maxWidth': '100%' }, initialData, onChange, reset, setReset, mode = "code", ...rest }: any) => {
    const editorRef: any = useRef(undefined);
    const handleChangeText = (event: any) => {
        try {
            JSON.parse(event)
        } catch (error) {
            onChange({ error })
        }
    }

    useEffect(() => {
        if (reset) {
            _.set(editorRef, 'current.props.value', initialData);
            editorRef?.current?.props?.onChangeText(initialData);
            setReset(false);
        }
    }, [reset]);

    return <div style={containerStyle} >
        <JsonEditor
            ref={editorRef}
            mode={mode}
            navigationBar={false}
            onChange={(data: any) => { onChange(data) }}
            onChangeText={handleChangeText}
            value={initialData || {}}
            height={"20rem"}
        />
    </div>
}

export default TransformSpecEditor;