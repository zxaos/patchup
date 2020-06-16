#!/usr/bin/env node
'use strict';

const core = require('@actions/core');
const github = require('@actions/github');
const context = github.context;
const config = require('./config');
const git = require('simple-git/promise');
const GitError = require('simple-git/src/lib/git-error').GitError;

async function run() {
	const options = config.get();
	console.log('starting rebase');
	const rebase = await rebaseOnto(options);
	if (rebase.success) {
		console.log('automated rebase succeeded');
		await pushUpdated(options);
	} else {
		core.warning('automated rebase failed');
		await createConflictPR(options, rebase.message);
	}
}

async function rebaseOnto(config) {
	const repo = git(config.localPath);
	repo.addConfig('user.name', 'patchup[bot]');
	repo.addConfig('user.email', 'github-action@users.noreply.github.com');

	await repo.addRemote('upstream', config.upstreamRepoURL);
	await repo.fetch('upstream', config.upstreamBranch);
	await repo.checkout(config.localBranch);

	const rebaseStatus = {
		success: false,
		message: ''
	};

	try {
		const targetTagSHA = await repo.revparse(config.targetTag);
		console.log(`patch start tag ${config.targetTag} is ${targetTagSHA}`);
		const rebaseResult = await repo.rebase([
			'--onto',
			`upstream/${config.upstreamBranch}`,
			`${config.targetTag}^`, // Note trailing ^, we want tag parent
			'--exec',
			'git rev-parse HEAD'
		]);

		const firstRebasedCommit = rebaseResult.split('\n')[0];

		// This isn't just informative, if we can't parse the sha out of the rebase
		// result, this should throw when we try to get commit details.
		console.log('resetting patch start tag to:', (await repo.show(firstRebasedCommit)).split('\n')[0]);

		await repo.tag([
			'-f',
			'-m',
			`Patchup-generated tag - start of floating patchset for ${config.localBranch}`,
			config.targetTag,
			firstRebasedCommit
		]);

		rebaseStatus.success = true;
	} catch (error) {
		if (error instanceof GitError) {
			console.log('failed to rebase:');
			console.log(error.message);
			console.log('--------');
			rebaseStatus.success = false;
			rebaseStatus.message = error.message;
		} else {
			throw error;
		}
	}

	return rebaseStatus;
}

async function createConflictPR(config, message) {
	const octokit = github.getOctokit(config.token);
	const upstreamUser = config.upstreamRepo.split('/')[0];

	const prDetails = {
		owner: context.repo.owner,
		repo: context.repo.repo,
		head: `${upstreamUser}:${config.upstreamBranch}`,
		base: config.localBranch
	};

	const {data: existingPRs} = await octokit.pulls.list({
		state: 'open',
		...prDetails
	});

	if (existingPRs.length > 0) {
		core.warning(`PR ${existingPRs[0].number} already exists, a new one will not be created`);
		return;
	}

	prDetails.maintainer_can_modify = false; // eslint-disable-line camelcase
	prDetails.title = `Manual update required for upstream branch ${config.upstreamBranch}`;
	prDetails.body = 'Patchup tried to rebase a local patch set onto upstream, but failed.\n' +
			'Please manually resolve conflicts from these changes.\n' +
			'The error was:\n' +
			'```\n' +
			message +
			'```\n\n\n' +
			'To attempt this rebase locally, run:\n' +
			`\`git rebase --onto upstream/${config.upstreamBranch} ${config.targetTag}^\`\n` +
			`then reset the tag \`${config.targetTag}\` to point to your first local commit.`;

	const {data: {number: pr}} = await octokit.pulls.create(prDetails);
	core.setOutput('pull_request', pr);

	if (config.conflictReviewers.length > 0) {
		console.log(`assigning PR conflict reviewers: ${config.conflictReviewers}`);
		await octokit.pulls.requestReviewers({
			owner: context.repo.owner,
			repo: context.repo.repo,
			pull_number: pr, // eslint-disable-line camelcase
			reviewers: config.conflictReviewers
		});
	}
}

async function pushUpdated(config) {
	const repo = git(config.localPath);
	console.log('deleting previous target tag on remote');
	await repo.raw(
		[
			'push',
			'--delete',
			'origin',
			config.targetTag
		]);
	console.log('pushing changes');
	return repo.push(
		'origin',
		config.localBranch,
		{'--follow-tags': null, '--force': null} // Note that despite the null, this is turning these options _on_
	);
}

if (require.main === module) {
	run()
		.then(() => {
			process.exit(0);
		})
		.catch(error => {
			core.setFailed(error.message);
		});
}

module.exports = {rebaseOnto};
