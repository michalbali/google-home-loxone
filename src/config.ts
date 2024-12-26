export class ComponentRaw {
    public id: string;
    public loxoneId?: string;
    public loxoneType: string;
    public name: string;
    public room: string;
    public customData?: {};
}

export class LoxoneConfig {
    public protocol: string;
    public url: string;
    public user: string;
    public password: string;
}

export class Config {
    public serverPort: string;
    public loxone: LoxoneConfig;
    public components: ComponentRaw[];
    public authorizedSubjects: string[];
    public oAuthUrl: string;
    public audience: string;
    public log: boolean;
    public testMode: boolean;
    public agentUserId: string;

    public postProcessHooks: {
        [trigger: string]: string;
    };
}
