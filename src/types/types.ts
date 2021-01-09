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
    layout: string;
    status: 'draft' | 'review' | 'published';
    slug: string;
    [key: string]: any
}

export const SchemaStatus = {
    DRAFT: 'draft',
    REVIEW: 'review',
    PUBLISHED: 'published'
}