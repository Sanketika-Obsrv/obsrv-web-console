import systemSettings from "data/systemSettings";
import _ from "lodash";

export const getAllSettings = async ({ data = {}, config }: any) => {
    try {
        return systemSettings;
    } catch (error) {
        return [];
    }
}

export const updateSetting = () => {

}

export const deleteSetting = () => {

}

export const readSetting = () => {

}

export const transformSystemSettingsResponse = (settings: Array<Record<string, any>>) => {
    return _.reduce(settings, (settings: Record<string, any>, setting: Record<string, any>) => {
        const { category } = setting;
        const existingSettings = _.get(settings, category) || [];
        settings[category] = [...existingSettings, setting];
        return settings;
    }, {});
}


