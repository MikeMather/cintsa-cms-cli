import { Strings } from "aws-sdk/clients/opsworks";

export type Config = {
    profile: string;
    appName: string;
    uniqueKey: string;
    domainName: string;
    region: string;
    siteGenerator: string;
};