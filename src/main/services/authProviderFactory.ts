import { PassportAuthProvider } from './passportAuthProvider';
import { KeycloakAuthProvider } from './keycloakAuthProvider';
import { BaseAuthProvider } from '../types';

export const authProviderFactory: (type: string, config?: any, sessionStore?: any) => BaseAuthProvider = (type, config, sessionStore) => {
    switch (type) {
        case 'keycloak':
            return new KeycloakAuthProvider(config, sessionStore);
        case 'basic':
            return new PassportAuthProvider();
        default:
            throw new Error("Invalid authentication service type");
    }
};
export { BaseAuthProvider };
