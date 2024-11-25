import { getSystemSetting } from "./configData";

export const navigateToGrafana = (dashboardLink: string) => {
    const graphanaUrl = getSystemSetting("GRAFANA_URL")
    if (graphanaUrl) {
        const url = `${graphanaUrl}/${dashboardLink}`
        window.open(url);
    }
} 
