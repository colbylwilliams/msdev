export interface Project {
    tenant?: string;
    fidalgo: Fidalgo;
}

export interface Fidalgo {
    extension?: string;
    project: FidalgoProject;
    catalog_item: string;
}

export interface FidalgoProject {
    name: string;
    group: string;
}

export interface FidalgoEnvironment {
    catalogItemName: string; // "Empty",
    deploymentParameters?: string; // null,
    description?: string; // null,
    environmentType: string; // "Dev",
    id: string; // "/subscriptions/***/resourceGroups/FidalgoTestProject/providers/Microsoft.Fidalgo/projects/Workflows/environments/ci-branch-dev-490852161",
    location: string; // "eastus",
    name: string; // "ci-branch-dev-490852161",
    outputs?: string; // null,
    provisioningState: string; // "Succeeded",
    resourceGroup: string; // "FidalgoTestProject",
    resourceGroupId: string; // "/subscriptions/4f946562-8f9e-4e46-93fe-19dfd30b6b97/resourceGroups/Workflows-ci-branch-dev-490852161",
    systemData: SystemData;
    tags?: string; // null,
    templateUri?: string; // null,
    type: string; // "microsoft.fidalgo/projects/environments"
}

export interface SystemData {
    createdAt: Date; // "2022-05-11T18:27:36.632049+00:00",
    createdBy: string; // "colbyw@microsoft.com",
    createdByType: string; // "User",
    lastModifiedAt: Date; // "2022-05-17T16:56:45.172124+00:00",
    lastModifiedBy: string; // "2dc3760b-4713-48b1-a383-1dfe3e449ec2",
    lastModifiedByType: string; // "Application"

}