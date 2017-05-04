import Rx from 'rx';
import requests from 'services/jenkins2/jenkins2Requests';

const WorkflowMultiBranchProject = 'org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject';
const OrganizationFolder = 'jenkins.branch.OrganizationFolder';
const Folder = 'com.cloudbees.hudson.plugins.folder.Folder';

export default {
    getInfo() {
        return {
            typeName: 'Jenkins 2.x',
            baseUrl: 'jenkins2',
            urlHint: 'URL, e.g. http://ci.jenkins-ci.org/',
            urlHelp: 'Jenkins server or view URL',
            icon: 'core/services/jenkins/icon.png',
            logo: 'core/services/jenkins/logo.png',
            defaultConfig: {
                baseUrl: 'jenkins2',
                name: '',
                projects: [],
                url: '',
                username: '',
                password: '',
                updateInterval: 60
            }
        };
    },

    /* eslint no-underscore-dangle: off */
    getAll: (settings) => requests.jobs({ url: settings.url, settings })
        .selectMany((job) => {
            switch (job._class) {
                case OrganizationFolder:
                    return Rx.Observable.fromArray(job.jobs)
                        .where((project) => project._class === WorkflowMultiBranchProject)
                        .selectMany((project) => Rx.Observable.fromArray(project.jobs)
                            .select((jobDetails) => ({
                                id: jobDetails.fullName,
                                name: `${project.name} / ${jobDetails.name}`,
                                group: job.name,
                                isDisabled: !jobDetails.buildable
                            }))
                        );
                case Folder:
                    return Rx.Observable.fromArray(job.jobs)
                        .select((jobDetails) => ({
                            id: jobDetails.fullName,
                            name: `${jobDetails.name}`,
                            group: job.name,
                            isDisabled: !jobDetails.buildable
                        }));
                default:
                    // FreeStyleProject or jenkins 1.x project
                    return Rx.Observable.return({
                        id: job.fullName || job.name,
                        name: job.name,
                        group: null,
                        isDisabled: !job.buildable
                    });
            }
        }),

    getLatest: (settings) => Rx.Observable.fromArray(settings.projects)
        .selectMany((id) => requests.jobDetails({ id, settings })
            .select((job) => {
                const [folder, project, branch] = id.split('/');
                const lastBuild = job.lastBuild || {};
                const lastCompletedBuild = job.lastCompletedBuild || {};
                let name = (branch) ?
                    `${project} (${branch})` :
                    `${project}`;
                let group = folder;
                if (!project) {
                    name = folder;
                    group = null;
                }
                const state = {
                    id,
                    name,
                    group,
                    webUrl: lastBuild.url,
                    isRunning: lastBuild.building,
                    isDisabled: !job.buildable,
                    isWaiting: job.inQueue,
                    tags: createTags(lastCompletedBuild),
                    changes: createChanges(lastBuild)
                };
                if (jobResults.statusKnown.includes(lastCompletedBuild.result)) {
                    state.isBroken = jobResults.broken.includes(lastCompletedBuild.result);
                }
                return state;
            })
            .catch((ex) => Rx.Observable.return(createError(id, ex)))
        )
};

const jobResults = {
    supported: ['SUCCESS', 'FAILURE', 'UNSTABLE', 'ABORTED', 'NOT_BUILT'],
    statusKnown: ['SUCCESS', 'FAILURE', 'UNSTABLE'],
    broken: ['FAILURE', 'UNSTABLE']
};

const createTags = (lastCompletedBuild) => {
    const resultName = {
        'UNSTABLE': 'Unstable',
        'ABORTED': 'Canceled',
        'NOT_BUILT': 'Not built'
    };
    const tags = [];
    if (resultName[lastCompletedBuild.result]) {
        tags.push({ name: resultName[lastCompletedBuild.result], type: 'warning' });
    }
    if (!jobResults.supported.includes(lastCompletedBuild.result)) {
        tags.push({
            name: 'Unknown',
            description: `Result [${lastCompletedBuild.result}] is unknown`
        });
    }
    return tags;
};

const createChanges = (lastBuild = []) => {
    const changeSets = (lastBuild.changeSet) ?
        [lastBuild.changeSet] :
        lastBuild.changeSets || [];
    return []
        .concat(
            ...changeSets.map((changeSet) => changeSet.items)
        ).map((change) => ({
            name: change.author.fullName,
            message: change.msg
        }));
};

const createError = (id, ex) => {
    const [folder, project, branch] = id.split('/');
    return {
        id,
        name: (branch) ?
            `${project} (${branch})` :
            `${project}`,
        group: folder,
        error: ex
    };
};