import { Strings } from "aws-sdk/clients/opsworks";

export type Config = {
    profile: string;
    appName: string;
    uniqueKey: string;
    domainName: string;
    region: string;
    siteGenerator: string;
};

export type Schema = {
    layout: string
    status: string
    slug: string
    [key: string]: any
}