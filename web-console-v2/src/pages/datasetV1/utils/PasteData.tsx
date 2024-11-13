import React from "react";
import { JsonEditor } from "jsoneditor-react";
import { useState } from "react";

export default function PasteData({ containerStyle = { 'maxWidth': '100%' }, initialData, onChange, ...rest }: any) {
    const [json, setJson] = useState(initialData || {});

    const handleChangeText = (event: any) => {
        try {
            JSON.parse(event)
        } catch (error) {
            onChange({})
        }
    }
    return (
        <>
            <div style={containerStyle}>
                <JsonEditor
                    mode="code"
                    navigationBar={false}
                    onChange={(data: any) => {onChange(data); setJson(data)}}
                    onChangeText={handleChangeText}
                    value={json}
                />
            </div>
        </>
    );
}