import axios from 'axios';
import appConfig from '../../shared/resources/appConfig';
import _ from 'lodash';
import userService from '../services/oauthUsers';

const keycloakUrl = appConfig.KEYCLOAK.URL;
const keycloakHTTPClient = axios.create({ baseURL: keycloakUrl });
const keycloakRealm = appConfig.KEYCLOAK.REALM;

export const authenticated = async (request: any) => {
    try {
        const userId = request?.kauth?.grant?.access_token?.content?.sub?.split(':');
        const email_address = request?.kauth?.grant?.access_token?.content?.email;
        const preferred_username = request?.kauth?.grant?.access_token?.content?.preferred_username;

        request.session.userId = userId?.[userId.length - 1];
        request.session.email_address = email_address;
        request.session.preferred_username = preferred_username;

        const user = await userService.find({ id: userId?.[0] });
        request.session.userDetails = _.pick(user, ['id', 'user_name', 'email_address', 'roles', 'is_owner']);
        request.session.roles = _.get(user, ['roles']);
    } catch (err) {
        console.log('user not authenticated', request?.kauth?.grant?.access_token?.content?.sub, err);
    }
};

export const deauthenticated = function (request: any) {
    delete request?.session?.userDetails;
    delete request?.session?.roles;
    delete request?.session?.userId;
    delete request?.session?.email_address;
    delete request?.session?.preferred_username;
    delete request?.session?.auth_redirect_uri;
    delete request?.session?.['keycloak-token'];
    
    if (request?.session) {
        request.session.sessionEvents = request?.session?.sessionEvents || [];
        delete request?.session?.sessionEvents;
    }
};

export const userCreate = async (access_token: any, userRequest: any) => {
    const { user_name, email_address } = userRequest;
    const password = _.trim(userRequest.password);
    const payload = {
        email: email_address,
        username: user_name,
        firstName: userRequest?.first_name,
        lastName: userRequest?.last_name,
        enabled: true,
        credentials: [
            {
                type: 'password',
                value: password,
                temporary: false,
            },
        ],
    };

    return keycloakHTTPClient
        .post(`/admin/realms/${keycloakRealm}/users`, payload, {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })
        .then((response) => {
            const location = _.get(response, 'headers.location');
            const userId = location ? _.last(location.split('/')) : null;
            if (!userId) {
                throw new Error('UserId not found');
            }
            return userId;
        })
        .catch((error) => {
            console.log(error);
        });
};

export const userCreateWithKeycloak = async (access_token: any, userRequest: any) => {
    const { user_name, email_address, roles } = userRequest;
    const id = await userCreate(access_token, userRequest);
    const created_on = new Date().toISOString();
    const userInfo = { id, user_name, email_address, created_on, roles };
    const result = await userService.save(userInfo);
    return result;
};

export const keycloakLogout = async (req: any) => {
    const userId = req?.session?.userId;
    const access_token = req?.kauth?.grant?.access_token?.token;
    const refresh_token = req?.kauth?.grant?.refresh_token?.token;

    const data = new URLSearchParams({
        client_id: req?.kauth?.grant?.access_token?.clientId,
        refresh_token: refresh_token,
    });

    return keycloakHTTPClient
        .post(`admin/realms/${keycloakRealm}/users/${userId}/logout`, data, {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })
        .then()
        .catch((error) => {
            console.log(error);
        });
};
