import chalk from "chalk"

export class Log {
    static info(message: string, ...optionalParams: any[]): void {
        const modifiedParams = optionalParams.map(param => {
            if (typeof param === 'string') {
                if (param.includes('action.devices.QUERY')) {
                    return param.replace('action.devices.QUERY', chalk.green('action.devices.QUERY'));
                } else if (param.includes('action.devices.EXECUTE')) {
                    return param.replace('action.devices.EXECUTE', chalk.green('action.devices.EXECUTE'));
                } else if (param.includes('action.devices.SYNC')) {
                    return param.replace('action.devices.SYNC', chalk.green('action.devices.SYNC'));
                }
            }
            return param;
        });

        console.log(`[${chalk.blue(new Date().toISOString())}] ${message}`, ...modifiedParams);

        // console.log(`[${chalk.blue(new Date().toISOString())}] ${message}`, ...optionalParams);
    }
    static warn(message: string, ...optionalParams: any[]): void {
        console.log(`[${chalk.blue(new Date().toISOString())}] ${chalk.red('WARNING')} ${message}`, ...optionalParams);
    }
    static error(message: string, ...optionalParams: any[]): void {
        console.log(`[${chalk.blue(new Date().toISOString())}] ${chalk.red('ERROR')} ${message}`, ...optionalParams);
    }
}