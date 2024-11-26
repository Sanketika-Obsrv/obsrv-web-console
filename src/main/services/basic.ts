import _ from 'lodash';
import { v4 } from 'uuid';
import bcrypt from 'bcryptjs';
import userService from '../services/oauthUsers';

export const userCreateAsBasic = async (userRequest: any) => {
    const { password } = userRequest;
    userRequest.password = await bcrypt.hash(password, 12);
    if (userRequest.mobile_number) {
        const { country_code, number } = userRequest.mobile_number;
        userRequest.mobile_number = `${String(country_code).trim()}_${String(number).trim()}`;
    }
    const userIdentifier = { id: v4(), created_on: new Date().toISOString() };
    const userInfo = { ...userRequest, ...userIdentifier };
    const result = await userService.save(userInfo);
    return result;
};
