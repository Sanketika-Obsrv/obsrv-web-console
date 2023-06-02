export interface User {
    id: string;
    user_name: string;
    password?: string; 
    first_name?: string;
    last_name?: string;
    provider?: string;
    email_address: string;
    mobile_number?: string;
    created_on: string;
    last_updated_on?: string;
}
