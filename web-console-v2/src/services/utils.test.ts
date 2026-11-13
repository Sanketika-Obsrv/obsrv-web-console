import { isSensitiveConfigKey, isSensitiveField, resolveUiSpecFormat, resolveUiSpecNode } from './utils';

describe('resolveUiSpecNode', () => {
    const uiSpec = {
        properties: {
            host: { type: 'string' },
            authenticationMechanism: {
                properties: {
                    password: { type: 'string', format: 'password', title: 'Password' }
                }
            }
        }
    };

    it('resolves a nested path', () => {
        expect(resolveUiSpecNode(uiSpec, 'authenticationMechanism.password')).toEqual({
            type: 'string',
            format: 'password',
            title: 'Password'
        });
    });

    it('returns undefined for a path the schema does not have', () => {
        expect(resolveUiSpecNode(uiSpec, 'authenticationMechanism.secret_key')).toBeUndefined();
        expect(resolveUiSpecNode(uiSpec, 'not.a.real.path')).toBeUndefined();
    });

    it('returns undefined when uiSpec itself is undefined', () => {
        expect(resolveUiSpecNode(undefined, 'host')).toBeUndefined();
    });
});

describe('resolveUiSpecFormat', () => {
    const uiSpec = { properties: { password: { format: 'password' }, host: { format: 'text' } } };

    it('returns the declared format', () => {
        expect(resolveUiSpecFormat(uiSpec, 'password')).toBe('password');
        expect(resolveUiSpecFormat(uiSpec, 'host')).toBe('text');
    });

    it('returns undefined when the schema has no entry', () => {
        expect(resolveUiSpecFormat(uiSpec, 'unknown_field')).toBeUndefined();
    });
});

describe('isSensitiveConfigKey', () => {
    it.each([
        'password', 'db_password', 'secret', 'private_key', 'access_key', 'api_key',
        'credential', 'token', 'pwd', 'connection_string', 'passphrase', 'account_key',
        'sas', 'keystore', 'server.pem', 'client_cert', 'signature'
    ])('matches %s', (key) => {
        expect(isSensitiveConfigKey(key)).toBe(true);
    });

    it.each(['host', 'port', 'topic', 'batch_size', 'username', 'schedule'])(
        'does not match %s',
        (key) => {
            expect(isSensitiveConfigKey(key)).toBe(false);
        }
    );
});

describe('isSensitiveField', () => {
    const uiSpec = {
        properties: {
            // schema explicitly says this is NOT a password, despite the name
            password: { format: 'text' },
            access_key: { format: 'password' },
            host: { format: 'text' }
        }
    };

    it('masks when the schema says password, regardless of name', () => {
        expect(isSensitiveField(uiSpec, 'access_key')).toBe(true);
    });

    it('still masks a field named like a credential even when its schema format says otherwise', () => {
        // Finding: schema format must not be exclusive-OR with the name-based denylist --
        // a field literally called "password" must still mask even if its own schema
        // entry declares a non-password format.
        expect(isSensitiveField(uiSpec, 'password')).toBe(true);
    });

    it('does not mask an ordinary field the schema explicitly covers', () => {
        expect(isSensitiveField(uiSpec, 'host')).toBe(false);
    });

    it('fails closed (masks) when the schema has no entry for the field at all', () => {
        expect(isSensitiveField(uiSpec, 'totally_unknown_field')).toBe(true);
    });

    it('fails closed when uiSpec itself is undefined (e.g. a failed fetch)', () => {
        expect(isSensitiveField(undefined, 'host')).toBe(true);
    });
});
