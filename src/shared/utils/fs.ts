/* eslint-disable security/detect-non-literal-require */
/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable @typescript-eslint/no-var-requires */
import fs from 'fs';
import path from 'path';

export const scrapModules = <Type extends { name: string }>(folderPath: string, basename: string) => {
    const mapping = new Map<string, Omit<Type, 'name'>>();
    fs.readdirSync(folderPath)
        .filter((file) => file !== basename)
        .forEach((file) => {
            const {
                default: { name, ...others },
            } = require(path.join(folderPath, file)) as { default: Type };

            mapping.set(name, others);
        });

    return mapping;
};
