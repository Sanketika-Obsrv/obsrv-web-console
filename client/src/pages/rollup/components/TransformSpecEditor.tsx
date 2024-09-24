//@ts-ignore
import { JsonEditor as Editor } from "jsoneditor-react";
import { useEffect, useRef } from "react";
import _ from "lodash"

export default function TransformSpecEditor({ containerStyle = { 'maxWidth': '100%' }, initialData, onChange, reset, setReset, mode = "code", ...rest }: any) {
    const editorRef: any = useRef();
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

    return (
        <>
            <div style={containerStyle} >
                <Editor
                    ref={editorRef}
                    mode={mode}
                    navigationBar={false}
                    onChange={(data: any) => { onChange(data) }}
                    onChangeText={handleChangeText}
                    value={initialData || {}}
                    height={"20rem"}
                />
            </div>
        </>
    );
}
