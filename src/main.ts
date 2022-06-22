import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as glob from '@actions/glob';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import { AzureDeployEnvironment, Project } from './types';

const DEFAULT_FIDALGO_EXTENSION = 'https://fidalgosetup.blob.core.windows.net/cli-extensions/fidalgo-0.4.0-py3-none-any.whl';

async function run(): Promise<void> {
    try {
        const env_name = core.getInput('name', { required: true });
        const env_type = core.getInput('type', { required: true });

        const pattern = core.getInput('project');

        core.debug(`project input: ${pattern}`);

        const globber = await glob.create(pattern);
        const files = await globber.glob();

        const file = files.length > 0 ? files[0] : undefined;

        if (file) {

            let fidalgoExt = DEFAULT_FIDALGO_EXTENSION;

            core.debug(`Found project.yml file: ${file}`);

            const contents = await fs.readFile(file, 'utf8');
            const project = yaml.load(contents) as Project;

            // allow for override of tenant
            if (project.tenant) {
                core.debug(`Found tenant id in project.yml file: ${project.tenant}`);
                core.setOutput('tenant', project.tenant);
            } else {
                // attempt to get tenant from azure using service principal
                core.debug('No tenant id found in project.yml file, attempting to get from Azure');

                const tenantId = await exec.getExecOutput('az', ['account', 'show', '--query', 'tenantId', '-o', 'tsv']);

                if (tenantId.stdout) {
                    core.debug(`Found tenant with id: ${tenantId.stdout.trim()}`);
                    core.setOutput('tenant', tenantId.stdout.trim());
                } else {
                    core.setFailed(`Failed to get tenant id from Azure: ${tenantId.stderr}`);
                }
            }

            if (project.azure_deploy) {
                core.debug('Found azure_deploy section in project.yml file');

                // allow for override of extension
                if (project.azure_deploy.extension) {
                    fidalgoExt = project.azure_deploy.extension;
                    core.debug(`Found fidalgo extension in project.yml file: ${fidalgoExt}`);
                } else {
                    // use default extension
                    core.debug(`No fidalgo extension found in project.yml file, using default: ${fidalgoExt}`);
                }

                core.setOutput('fidalgo', fidalgoExt);

                if (project.azure_deploy.project) {
                    core.debug('Found azure deploy project section in project.yml file');

                    if (project.azure_deploy.project.name) {
                        core.debug(`Found azure deploy project name in project.yml file: ${project.azure_deploy.project.name}`);
                        core.setOutput('project_name', project.azure_deploy.project.name);
                    } else {
                        core.setFailed(`Could not get azure deploy project name from project.yml: ${contents}`);
                    }

                    if (project.azure_deploy.project.group) {
                        core.debug(`Found azure deploy project group in project.yml file: ${project.azure_deploy.project.group}`);
                        core.setOutput('project_group', project.azure_deploy.project.group);
                    } else {
                        core.setFailed(`Could not get azure deploy project group from project.yml: ${contents}`);
                    }

                    if (project.azure_deploy.catalog_item) {
                        core.debug(`Found azure deploy catalog item in project.yml file: ${project.azure_deploy.catalog_item}`);
                        core.setOutput('catalog_item', project.azure_deploy.catalog_item);
                    } else {
                        core.setFailed(`Could not get azure deploy catalog item from project.yml: ${contents}`);
                    }
                } else {
                    core.setFailed(`No azure deploy project section found in project.yml file: ${contents}`);
                }
            } else {
                core.setFailed(`No azure_deploy section found in project.yml file: ${contents}`);
            }

            await exec.exec('az', ['extension', 'add', '--only-show-errors', '-y', '-s', fidalgoExt]);

            const environmentShow = await exec.getExecOutput('az', ['fidalgo', 'admin', 'environment', 'show', '--only-show-errors', '-g', project.azure_deploy.project.group, '--project-name', project.azure_deploy.project.name, '-n', env_name], { ignoreReturnCode: true });
            // const environment = await exec.getExecOutput('az', ['fidalgo', 'admin', 'environment', 'show', '-g', project.fidalgo.project.group, '--project-name', project.fidalgo.project.name, '-n', 'foo'], { ignoreReturnCode: true });

            let exists = false;
            let created = false;

            if (environmentShow.exitCode === 0) {
                exists = true;
                core.debug('Found existing environment');
                const environment = JSON.parse(environmentShow.stdout) as AzureDeployEnvironment;
                core.setOutput('group', environment.resourceGroupId);
            } else {

                const createIfNotExists = core.getBooleanInput('createIfNotExists');
                core.debug(`createIfNotExists: ${createIfNotExists}`);

                if (createIfNotExists) {
                    core.debug('Creating environment');
                    const create = await exec.getExecOutput('az', ['fidalgo', 'admin', 'environment', 'create', '--only-show-errors', '-g', project.azure_deploy.project.group, '--project-name', project.azure_deploy.project.name, '-n', env_name, '--environment-type', env_type, '--catalog-item-name', project.azure_deploy.catalog_item], { ignoreReturnCode: true });
                    if (create.exitCode === 0) {
                        exists = true;
                        created = true;
                        core.debug('Created environment');
                        const environment = JSON.parse(create.stdout) as AzureDeployEnvironment;
                        core.setOutput('group', environment.resourceGroupId);
                    } else {
                        core.setFailed(`Failed to create environment: ${create.stderr}`);
                    }
                } else {
                    core.debug(`No existing environment found: code: ${environmentShow.exitCode}`);
                }
            }

            core.setOutput('exists', exists);
            core.setOutput('created', created);

        } else {
            core.setFailed(`Could not find project.yml file with specified glob: ${pattern}`);
        }
    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message);
    }
}

run();