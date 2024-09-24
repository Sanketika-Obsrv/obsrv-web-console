import { getConfigValue } from "./configData";

export const navigateToGrafana = (dashboardLink: string) => {
    const graphanaUrl = getConfigValue("GRAFANA_URL")
    if (graphanaUrl) {
        const url = `${graphanaUrl}/${dashboardLink}`
        window.open(url);
    }
} 
