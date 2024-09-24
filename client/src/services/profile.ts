import apiEndpoints from "data/apiEndpoints";
import { http } from 'services/http'
import { error } from "./toaster";
import { generateEndEvent } from "./telemetry";

export const logout = async (config: Record<string, any>) => {
    const { dispatch, navigate } = config;
    try {
        await http.get(apiEndpoints.logout);
        generateEndEvent({
            edata: {
                type: "App",
                pageid: "logout"
            },
            object: {}
        })
        navigate(`/login`);
    } catch (err) {
        dispatch(error({ message: "Failed to logout" }));
    }
}