'use strict';

const core = require('@actions/core');
const github = require('@actions/github');
const context = github.context;
const config = require('./config');
const git = require('simple-git/promise');
const GitError = require('simple-git/src/lib/git-error').GitError;

async function run() {
	try {
		const options = config.get();
		console.log('running with config:');
		console.log(options);
		const rebase = await rebaseOnto(options);
		if (rebase.success) {
			await pushUpdated(options);
		} else {
			core.warning('automated rebase failed');
			createConflictPR(config, rebase.message);
		}
	} catch (error) {
		core.setFailed(error.message);
	}
}

async function rebaseOnto(config) {
	console.log('Starting rebase...');
	const repo = git(config.localPath);
	const rebaseStatus = {
		success: false,
		message: ''
	};

	try {
		await repo.checkout(config.localBranch);
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

	const pr = await octokit.pulls.create({
		owner: context.repo.owner,
		repo: context.repo.repo,
		title: `Manual update required for upstream ${config.upstreamBranch}`,
		head: config.upstreamGithub,
		base: config.localBranch,
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
	await repo.raw(
		[
			'push',
			'--delete',
			config.upstreamRemote,
			config.targetTag
		]);

	return repo.push(
		'origin',
		config.localBranch,
		{'--follow-tags': null, '--force': null} // Note that despite the null, this is turning these options _on_
	);
}

if (require.main === module) {
	run();
}

module.exports = {rebaseOnto};
