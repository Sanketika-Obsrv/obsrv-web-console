import Google from 'assets/images/auth/google.svg';
import Keycloak from 'assets/images/auth/keycloak.svg';
import pageIds from 'data/telemetry/pageIds';
import { generateStartEvent } from 'services/telemetry';
import interactIds from 'data/telemetry/interact.json';

export default [
    {
        value: "Google",
        label: "Google",
        edataId: interactIds.login_google,
        icon: <img src={Google} alt="Google" />,
        onClick: () => {
            generateStartEvent({
                edata: {
                    type: interactIds.login_google,
                    pageid: pageIds.login, 
                },
                object: {}
            });
            window.open("/api/auth/google", "_self")
        }
    },
    {
        value: "Keycloak",
        label: "Keycloak",
        edataId: interactIds.login_keycloak,
        icon: <img src={Keycloak} alt="Keycloak" />,
        onClick: () => {
            generateStartEvent({
                edata: {
                    type: interactIds.login_keycloak,
                    pageid: pageIds.login, 
                },
                object: {}
            });
            window.open("/api/auth/keycloak", "_self")
        }
    }
]
