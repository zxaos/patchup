'use strict';

const core = require('@actions/core');
// Const wait = require('./wait');
const config = require('./config');
const git = require('simple-git/promise');

async function run() {
	try {
		console.log('running with config:');
		console.log(config);

		// Get local
		// const ms = '1000';
		// console.log(`Waiting ${ms} milliseconds ...`);

		// core.debug((new Date()).toTimeString());
		// await wait(Number.parseInt(ms, 10));
		// core.debug((new Date()).toTimeString());

		// core.setOutput('time', new Date().toTimeString());
		await rebaseOnto(config);
	} catch (error) {
		core.setFailed(error.message);
	}
}

async function rebaseOnto(config) {
	console.log('Starting rebase...');
	const repo = git(config.localPath);
	try {
		await repo.rebase([
			'--onto',
			`${config.upstreamRemote}/${config.upstreamBranch}`,
			`${config.targetTag}^`
		]);
	} catch (error) {
		console.log(error.message);
		console.log(error.stack);
		console.log(error.git);
		core.setFailed(error.message);
		// Trigger pull request
	}

	console.log('Successfully rebased');

	// Re-tag targetTag onto the new corresponding commit
	// push
}

run();
