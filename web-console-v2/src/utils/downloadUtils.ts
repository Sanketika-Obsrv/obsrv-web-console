import _ from "lodash";

export const downloadJsonFile = (jsonData: any, fileName: string) => {
    const json = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = href;
    link.download = fileName + '.json';
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(href);
};

export const downloadJsonFileV1 = (jsonData: any, fileName: string, schema: boolean = false) => {


    const updatedJson = schema ? jsonData : _.omit(jsonData, ["properties", "required"])
    const json = JSON.stringify(updatedJson, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const href = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = href;
    link.download = fileName + ".json";
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(href);
}
