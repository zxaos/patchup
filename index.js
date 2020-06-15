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
	console.log('why is this not updating???');
	console.log('running with config:');
	console.log(options);
	console.log('starting rebase');
	const rebase = await rebaseOnto(options);
	if (rebase.success) {
		console.log('rebase was successful');
		await pushUpdated(options);
	} else {
		core.warning('automated rebase failed');
		await createConflictPR(options, rebase.message);
	}
}

async function rebaseOnto(config) {
	console.log('setting up repo');
	const repo = git(config.localPath);
	repo.addConfig('user.name', 'patchup[bot]');
	repo.addConfig('user.email', 'github-action@users.noreply.github.com');

	const rebaseStatus = {
		success: false,
		message: ''
	};

	try {
		console.log('checking out branch');
		await repo.checkout(config.localBranch);
		console.log('starting rebase');
		const targetTagSHA = await repo.revparse(config.targetTag);
		console.log(`patch start tag ${config.targetTag} is ${targetTagSHA}`);
		const rebaseResult = await repo.rebase([
			'--onto',
			`${config.upstreamRemote}/${config.upstreamBranch}`,
			`${config.targetTag}^`, // Note trailing ^, we want tag parent
			'--exec',
			'git rev-parse HEAD'
		]);

		console.log('Successfully rebased');

		const firstRebasedCommit = rebaseResult.split('\n')[0];

		// This isn't just informative, if we can't parse the sha out of the rebase
		// result, this should throw when we try to get commit details.
		console.log('Resetting tag to:', (await repo.show(firstRebasedCommit)).split('\n')[0]);

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
			console.log('Failed to rebase:');
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
	const token = core.getInput('repo-token');
	const octokit = github.getOctokit(token);

	// Idea: is there an existing PR? Don't create one to prevent spamming
	console.log('creating pr with details:');
	console.log({
		owner: context.repo.owner,
		repo: context.repo.repo,
		title: `Manual update required for upstream branch ${config.upstreamBranch}`,
		head: config.upstreamGithub,
		base: config.localBranch,
		maintainer_can_modify: false, // eslint-disable-line camelcase
		body: 'Patchup tried to rebase a local patch set onto upstream, but failed.\n' +
				'Please manually resolve conflicts from these changes.\n' +
				'The error was:\n' +
				message
	});

	const pr = await octokit.pulls.create({
		owner: context.repo.owner,
		repo: context.repo.repo,
		title: `Manual update required for upstream branch ${config.upstreamBranch}`,
		head: config.upstreamGithub,
		base: config.localBranch,
		maintainer_can_modify: false, // eslint-disable-line camelcase
		body: 'Patchup tried to rebase a local patch set onto upstream, but failed.\n' +
				'Please manually resolve conflicts from these changes.\n' +
				'The error was:\n' +
				message
	});

	if (config.conflictReviewers.length > 0) {
		octokit.pulls.requestReviewers({
			owner: context.repo.owner,
			repo: context.repo.repo,
			pull_number: pr.data.number, // eslint-disable-line camelcase
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
			console.log('exiting with main success');
			process.exit(0);
		})
		.catch(error => {
			console.log('exiting with main failure');
			core.setFailed(error.message);
		});
}

module.exports = {rebaseOnto};
